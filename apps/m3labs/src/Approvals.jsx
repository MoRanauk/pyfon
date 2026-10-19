import { useCallback, useEffect, useState } from 'react';
import { get, post } from './http.js';

const base = '/v1/partner/approvals';

export default function Approvals() {
  const [list, setList] = useState([]);
  const [which, setWhich] = useState('pending');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [action, setAction] = useState('price_change');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [why, setWhy] = useState({});

  const load = useCallback(async () => {
    try { setList((await get(base + '?status=' + which)).requests); } catch (e) { setErr(e.message); }
  }, [which]);
  useEffect(() => { load(); }, [load]);

  async function run(fn, ok) {
    setErr(''); setMsg('');
    try { await fn(); setMsg(ok); } catch (e) { setErr(e.message); }
    load();
  }
  function create() {
    const payload = action === 'price_change' ? { sku: sku.trim(), priceKes: parseInt(price, 10) } : { sku: sku.trim() };
    run(() => post(base, { action, payload }), 'Request created. The other two partners must approve.');
  }

  return (
    <div>
      <h1 className="center">Approvals</h1>
      <p className="center muted">Price changes and removing products need a yes from all three partners.</p>
      {msg ? <p className="ok center">{msg}</p> : null}
      {err ? <p className="err center">{err}</p> : null}

      <section className="card">
        <h2>New request</h2>
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="price_change">Change a price</option>
          <option value="product_delete">Remove a product from sale</option>
        </select>
        <input placeholder="Product code (SKU)" value={sku} onChange={(e) => setSku(e.target.value)} />
        {action === 'price_change' ? <input type="number" min="0" placeholder="New price in KES" value={price} onChange={(e) => setPrice(e.target.value)} /> : null}
        <button type="button" onClick={create}>Send for approval</button>
      </section>

      <p className="center">
        <select value={which} onChange={(e) => setWhich(e.target.value)}>
          <option value="pending">Waiting for votes</option>
          <option value="executed">Done (all three approved)</option>
          <option value="all">All recent</option>
        </select>
      </p>
      {list.length === 0 ? <p className="center muted">Nothing here.</p> : null}
      {list.map((r) => {
        const yes = r.votes.filter((v) => v.vote === 'approve').length;
        return (
          <section className="card" key={r.id}>
            <h3>{r.summary}</h3>
            <p className="muted">{r.status} {'\u00b7'} {yes} of 3 approved {'\u00b7'} {new Date(r.createdAt).toLocaleString('en-KE')}</p>
            {r.votes.filter((v) => v.reason).map((v, i) => <p className="muted" key={i}>Rejected: {v.reason}</p>)}
            {r.status === 'pending' ? (
              <div>
                <button type="button" onClick={() => run(() => post(base + '/' + r.id + '/vote', { vote: 'approve' }), 'Your approval is saved')}>Approve</button>
                <input placeholder="Reason, if rejecting" value={why[r.id] || ''} onChange={(e) => setWhy({ ...why, [r.id]: e.target.value })} />
                <button type="button" className="danger" onClick={() => run(() => post(base + '/' + r.id + '/vote', { vote: 'reject', reason: why[r.id] || '' }), 'Rejected')}>Reject</button>
                <button type="button" className="linkbtn" onClick={() => run(() => post(base + '/' + r.id + '/cancel'), 'Request cancelled')}>Cancel my request</button>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
