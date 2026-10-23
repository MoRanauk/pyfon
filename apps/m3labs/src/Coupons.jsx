import { useCallback, useEffect, useState } from 'react';
import { get, post } from './http.js';
import { STAGE } from './api.js';

const B = '/v1/partner/coupons';
const SHOPS = [['mco', 'M & Co. Brands'], ['prestige', 'Gift Hub'], ['trim', 'TriM Atelier']];
const blank = { code: '', kind: 'percent', value: '10', min: '0', max: '', shops: [], from: '', to: '' };
const day = (d) => (d ? new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export default function Coupons() {
  const [list, setList] = useState(null);
  const [f, setF] = useState(blank);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setList((await get(B)).coupons); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const toggleShop = (c) => setF((s) => ({ ...s, shops: s.shops.includes(c) ? s.shops.filter((x) => x !== c) : [...s.shops, c] }));

  async function run(fn, ok) {
    setErr(''); setMsg(''); setBusy(true);
    try { await fn(); setMsg(ok); } catch (e) { setErr(e.message); }
    setBusy(false);
    load();
  }
  function create() {
    const value = parseInt(f.value, 10);
    if (!f.code.trim()) return setErr('Enter a coupon code.');
    if (!(value > 0)) return setErr('Enter the discount value.');
    if (f.kind === 'percent' && value > 15) return setErr('A percentage coupon can be 15% at most.');
    const body = {
      code: f.code.trim(), kind: f.kind, value, minOrderKes: parseInt(f.min || '0', 10) || 0,
      maxUses: f.max ? parseInt(f.max, 10) : null, storefronts: f.shops,
      startsAt: f.from ? new Date(f.from + 'T00:00:00').toISOString() : null,
      endsAt: f.to ? new Date(f.to + 'T23:59:59').toISOString() : null,
    };
    run(async () => { await post(B, body); setF(blank); }, 'Coupon created. It starts with your approval. The other two partners must approve before it works.');
  }

  if (STAGE === 'dev') return <p className="center">Coupons are managed on the partner desks.</p>;
  return (
    <div>
      <h1 className="center">Coupons</h1>
      <p className="center muted">A coupon works only after all three partners approve it. Percentage coupons are 15% at most. Each customer can use a coupon once. Discounts apply to items, not delivery.</p>
      {msg ? <p className="ok center">{msg}</p> : null}
      {err ? <p className="err center">{err}</p> : null}

      <section className="card">
        <h2>New coupon</h2>
        <input placeholder="Code, for example WELCOME10" value={f.code} onChange={set('code')} maxLength={20} />
        <select value={f.kind} onChange={set('kind')}>
          <option value="percent">Percentage off (15% at most)</option>
          <option value="fixed">Fixed amount off (KES)</option>
        </select>
        <input type="number" min="1" placeholder={f.kind === 'percent' ? 'Percent, 1 to 15' : 'Amount in KES'} value={f.value} onChange={set('value')} />
        <input type="number" min="0" placeholder="Minimum order in KES (0 for none)" value={f.min} onChange={set('min')} />
        <input type="number" min="1" placeholder="Maximum number of uses (empty for no limit)" value={f.max} onChange={set('max')} />
        <p className="muted">Shops (leave all unticked for every shop)</p>
        <div className="row">
          {SHOPS.map(([c, n]) => <label key={c}><input type="checkbox" checked={f.shops.includes(c)} onChange={() => toggleShop(c)} /> {n}</label>)}
        </div>
        <p className="muted">Starts on (optional)</p>
        <input type="date" value={f.from} onChange={set('from')} />
        <p className="muted">Ends on (optional)</p>
        <input type="date" value={f.to} onChange={set('to')} />
        <button type="button" disabled={busy} onClick={create}>Create and approve</button>
      </section>

      {list === null ? <p className="center muted">Loading...</p> : null}
      {list && list.length === 0 ? <p className="center muted">No coupons yet.</p> : null}
      {(list || []).map((c) => (
        <section className="card" key={c.id}>
          <h3>{c.code} <span className="pill">{c.status}</span></h3>
          <p>{c.kind === 'percent' ? c.value + '% off' : 'KES ' + Number(c.value).toLocaleString('en-KE') + ' off'}
            {c.minOrderKes ? ', minimum order KES ' + Number(c.minOrderKes).toLocaleString('en-KE') : ''}</p>
          <p className="muted">
            Shops: {c.storefronts.length ? c.storefronts.join(', ') : 'all'} {'\u00b7'} Used {c.usedCount}{c.maxUses ? ' of ' + c.maxUses : ''}
            {c.startsAt ? ' \u00b7 from ' + day(c.startsAt) : ''}{c.endsAt ? ' \u00b7 until ' + day(c.endsAt) : ''}
          </p>
          {c.status === 'pending' ? <p className="muted">{c.approvals} of {c.needed} partners approved</p> : null}
          <div>
            {c.status === 'pending' && !c.approvedByMe ? <button type="button" disabled={busy} onClick={() => run(() => post(B + '/' + c.id + '/approve'), 'Your approval is saved.')}>Approve</button> : null}
            {c.status !== 'disabled' ? <button type="button" className="danger" disabled={busy} onClick={() => run(() => post(B + '/' + c.id + '/disable'), 'Coupon disabled.')}>Disable</button> : null}
          </div>
        </section>
      ))}
    </div>
  );
}
