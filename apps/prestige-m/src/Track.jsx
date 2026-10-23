import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './od.css';
import { API_URL, STORE } from './api.js';

function when(d) {
  try { return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; }
}

export default function Track() {
  const [sp] = useSearchParams();
  const [ref, setRef] = useState(sp.get('ref') || '');
  const [phone, setPhone] = useState('');
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setErr(''); setRes(null); setBusy(true);
    try {
      const r = await fetch(API_URL + '/v1/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Interface': STORE },
        body: JSON.stringify({ ref: ref.trim(), phone: phone.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const d = j.error && Array.isArray(j.error.details) && j.error.details.length ? j.error.details.map((x) => (x && x.message) || x).join('. ') : '';
        throw new Error(r.status === 429 ? 'Too many tries. Please wait a few minutes.' : d || (j.error && j.error.message) || 'Could not check the order.');
      }
      setRes(j.order);
    } catch (ex) { setErr(ex.message); }
    setBusy(false);
  }

  const t = res && res.tracking;
  return (
    <div className="od">
      <h1>Track my order</h1>
      <form className="od-form" onSubmit={submit}>
        <label><small>Order number</small><input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="ORD-000123" autoCapitalize="characters" /></label>
        <label><small>Phone number used for the order</small><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" inputMode="tel" /></label>
        {err ? <p className="od-err" role="alert">{err}</p> : null}
        <button type="submit" className="od-btn" disabled={busy}>{busy ? 'Checking...' : 'Track order'}</button>
      </form>
      {res ? (
        <div className="od-card">
          <div className="od-head"><h3>{res.ref}</h3><span className="od-muted">{when(res.createdAt)}</span></div>
          <div className="od-badge">{res.cancelled ? 'Cancelled' : t ? t.currentLabel : 'Received'}</div>
          {t ? (
            <ol className="od-steps">
              {t.stages.map((s) => (
                <li key={s.key} className={'od-s-' + s.state}>
                  <span className="od-dot" />
                  <span>{s.label}</span>
                  {s.state !== 'todo' && s.at ? <span className="od-muted">{when(s.at)}</span> : null}
                  {s.state === 'current' && s.note ? <span className="od-note">{s.note}</span> : null}
                </li>
              ))}
            </ol>
          ) : null}
          <p className="od-muted">Delivery: {res.delivery}</p>
        </div>
      ) : null}
      <p className="od-center"><Link to="/orders">Signed in? See all my orders</Link></p>
    </div>
  );
}
