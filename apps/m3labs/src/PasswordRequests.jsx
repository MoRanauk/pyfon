import { useCallback, useEffect, useState } from 'react';
import { get, post } from './http.js';

const B = '/v1/dev/password-help';
const SHOP = { mco: 'M & Co. Brands', prestige: 'Gift Hub', trim: 'TriM Atelier' };
const when = (d) => (d ? new Date(d).toLocaleString('en-KE') : '');

export default function PasswordRequests() {
  const [list, setList] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try { setList((await get(B)).requests); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function done(id) {
    setErr(''); setMsg('');
    try { await post(B + '/' + id + '/done'); setMsg('Marked as done.'); } catch (e) { setErr(e.message); }
    load();
  }
  return (
    <div>
      <h1 className="center">Password requests</h1>
      <p className="center muted">Customers who asked for help. Open Developer desk &gt; People &gt; Users, right-click the customer, choose Send temporary password, then press Mark done here.</p>
      {msg ? <p className="ok center">{msg}</p> : null}
      {err ? <p className="err center">{err}</p> : null}
      {list === null ? <p className="center muted">Loading...</p> : null}
      {list && list.length === 0 ? <p className="center muted">No requests yet.</p> : null}
      {(list || []).map((r) => (
        <section className="card" key={r.id}>
          <h3>{r.email} <span className="pill">{r.status}</span></h3>
          <p className="muted">{r.name ? r.name + ' \u00b7 ' : ''}{SHOP[r.shop] || r.shop} {'\u00b7'} asked {when(r.createdAt)}{r.handledAt ? ' \u00b7 done ' + when(r.handledAt) : ''}</p>
          {r.status === 'open' ? <button type="button" onClick={() => done(r.id)}>Mark done</button> : null}
        </section>
      ))}
    </div>
  );
}
