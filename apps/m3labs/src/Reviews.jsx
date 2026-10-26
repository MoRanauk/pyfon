import { useCallback, useEffect, useState } from 'react';
import { get, patch } from './http.js';

const SHOP = { mco: 'M & Co. Brands', prestige: 'Pyfon Gift Hub', trim: 'TriM Atelier' };
const when = (d) => (d ? new Date(d).toLocaleString('en-KE') : '');
const stars = (n) => '\u2605'.repeat(n) + '\u2606'.repeat(5 - n);

function ReviewCard({ r, onSave }) {
  const shown = r.editedBody || r.body;
  const [text, setText] = useState(shown);
  const [busy, setBusy] = useState(false);
  const changed = text.trim() !== shown.trim();
  async function act(status) {
    setBusy(true);
    await onSave(r.id, status, changed ? text.trim() : undefined);
    setBusy(false);
  }
  return (
    <section className="card">
      <h3>{stars(r.rating)} <span className="pill">{r.status}</span> {r.verified ? <span className="chip">Verified buyer</span> : null}</h3>
      <p className="muted">{r.name} {'\u00b7'} {SHOP[r.store] || r.store} {'\u00b7'} {r.item || r.sku || 'Whole shop'} {'\u00b7'} {when(r.createdAt)}</p>
      {r.editedBody ? <p className="muted">Customer wrote: {r.body}</p> : null}
      <textarea style={{ width: '100%', boxSizing: 'border-box', minHeight: 80 }} maxLength={800} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="mrow" style={{ marginTop: 8 }}>
        {r.status !== 'published' ? <button type="button" disabled={busy} onClick={() => act('published')}>Publish</button> : null}
        {r.status === 'published' && changed ? <button type="button" disabled={busy} onClick={() => act(undefined)}>Save text</button> : null}
        {r.status !== 'hidden' ? <button type="button" className="danger" disabled={busy} onClick={() => act('hidden')}>Hide</button> : null}
      </div>
    </section>
  );
}

export default function Reviews() {
  const [status, setStatus] = useState('pending');
  const [store, setStore] = useState('');
  const [list, setList] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try { setList((await get('/v1/reviews/admin?status=' + status + '&store=' + store)).reviews); } catch (e) { setErr(e.message); }
  }, [status, store]);
  useEffect(() => { load(); }, [load]);
  const save = useCallback(async (id, st, body) => {
    setErr(''); setMsg('');
    try {
      const payload = {};
      if (st) payload.status = st;
      if (body) payload.body = body;
      await patch('/v1/reviews/admin/' + id, payload);
      setMsg('Saved.');
    } catch (e) { setErr(e.message); }
    load();
  }, [load]);
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 className="center">Customer reviews</h1>
      <p className="center muted">Check each review. You can fix spelling in the box, then press Publish. Published reviews show in the shop.</p>
      <div className="mrow" style={{ justifyContent: 'center' }}>
        <select value={status} onChange={(e) => { setList(null); setStatus(e.target.value); }}>
          <option value="pending">Waiting for you</option>
          <option value="published">Published</option>
          <option value="hidden">Hidden</option>
          <option value="">All</option>
        </select>
        <select value={store} onChange={(e) => { setList(null); setStore(e.target.value); }}>
          <option value="">All shops</option>
          <option value="mco">M &amp; Co. Brands</option>
          <option value="prestige">Pyfon Gift Hub</option>
          <option value="trim">TriM Atelier</option>
        </select>
      </div>
      {msg ? <p className="ok center">{msg}</p> : null}
      {err ? <p className="err center">{err}</p> : null}
      {list === null ? <p className="center muted">Loading...</p> : null}
      {list && list.length === 0 ? <p className="center muted">Nothing here.</p> : null}
      {(list || []).map((r) => <ReviewCard key={r.id + r.status + (r.editedBody || '')} r={r} onSave={save} />)}
    </div>
  );
}
