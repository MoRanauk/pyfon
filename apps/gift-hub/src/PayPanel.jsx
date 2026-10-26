import { useEffect, useState } from 'react';
import { API_URL, tokens } from './api.js';

const kes = (n) => 'KES ' + Number(n || 0).toLocaleString('en-KE');

async function call(iface, method, path, body) {
  const t = await tokens.get();
  const r = await fetch(API_URL + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Interface': iface, Authorization: 'Bearer ' + t },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d.error && d.error.message) || 'Something went wrong (' + r.status + ')');
  return d;
}

const box = { border: '1px solid #c9a227', borderRadius: 10, padding: '12px 14px', margin: '12px 0', textAlign: 'left' };

export default function PayPanel({ orderRef, iface, startOpen }) {
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(Boolean(startOpen));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');

  function reload() {
    return call(iface, 'GET', '/v1/customer/payments/info?order=' + encodeURIComponent(orderRef)).then(setInfo).catch(() => setInfo(null));
  }
  useEffect(() => { reload(); }, [orderRef]);

  if (!info || info.cancelled) return null;
  if (info.dueKes <= 0) return <div style={box}><strong>Paid in full.</strong> Thank you.</div>;
  const waiting = (info.payments || []).some((p) => p.status === 'awaiting');

  async function paid() {
    setBusy(true); setErr('');
    try {
      const r = await call(iface, 'POST', '/v1/customer/payments/claim', { orderRef });
      setDone(r.message || 'Thank you. We will check your payment.');
      setOpen(false);
      await reload();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div style={box}>
      <strong>Amount due: {kes(info.dueKes)}</strong>
      {done ? <p>{done}</p> : null}
      {waiting && !done ? <p>We have noted your payment and are checking it. We will message you when it is confirmed.</p> : null}
      {!info.till ? <p>Payment details are not ready yet. Please use the WhatsApp message to pay.</p> : null}
      {info.till && !open && !waiting ? (
        <p>
          <button type="button" disabled style={{ marginRight: 8 }}>Pay with M-Pesa prompt (coming soon)</button>
          <button type="button" onClick={() => setOpen(true)}>Pay to our till</button>
        </p>
      ) : null}
      {info.till && open ? (
        <div>
          <ol style={{ paddingLeft: 18 }}>
            <li>Open M-Pesa, choose Lipa na M-Pesa, then Buy Goods and Services.</li>
            <li>Till number: <strong>{info.till}</strong> ({info.tillName})</li>
            <li>Amount: <strong>{kes(info.dueKes)}</strong>. Enter your PIN.</li>
            <li>When M-Pesa confirms, tap the button below. That is all.</li>
          </ol>
          {err ? <p role="alert" style={{ color: '#b00020' }}>{err}</p> : null}
          <p>
            <button type="button" disabled={busy} onClick={paid}>{busy ? 'Sending...' : 'I have paid'}</button>{' '}
            <button type="button" onClick={() => setOpen(false)}>Cancel</button>
          </p>
        </div>
      ) : null}
    </div>
  );
}
