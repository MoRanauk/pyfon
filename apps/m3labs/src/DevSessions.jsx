import { useCallback, useEffect, useState } from 'react';
import { get, post } from './http.js';

const B = '/v1/dev/system/sessions';
const ago = (s) => (s < 60 ? s + ' s ago' : s < 3600 ? Math.round(s / 60) + ' min ago' : Math.round(s / 3600) + ' h ago');
const who = (r) => r.role + (r.partner_stage ? ' \u00b7 ' + r.partner_stage : '');

export default function DevSessions() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [mins, setMins] = useState('60');
  const load = useCallback(async () => {
    try { setD(await get(B + '?minutes=' + mins)); setErr(''); } catch (e) { setErr(e.message); }
  }, [mins]);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  async function end(r) {
    if (!window.confirm('Sign ' + r.email + ' out everywhere? They must log in again.')) return;
    setMsg(''); setErr('');
    try { await post(B + '/' + r.id + '/end'); setMsg(r.email + ' was signed out.'); load(); } catch (e) { setErr(e.message); }
  }
  async function endAll() {
    if (!window.confirm('Sign EVERYONE else out, including customers and partners?')) return;
    setMsg(''); setErr('');
    try { const x = await post(B + '/end-all'); setMsg(x.people + ' people signed out.'); load(); } catch (e) { setErr(e.message); }
  }

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <h1 className="center">Live sessions</h1>
      <p className="center muted">Signed-in people seen recently. The sign-out button ends all of that person's sessions at once. The list refreshes by itself.</p>
      {err ? <p className="err center">{err}</p> : null}
      {msg ? <p className="center">{msg}</p> : null}
      <div className="actbar" style={{ justifyContent: 'center' }}>
        {[['15', '15 min'], ['60', '1 hour'], ['480', '8 hours']].map(([v, l]) => (
          <button key={v} type="button" className={mins === v ? 'btn' : 'line'} onClick={() => setMins(v)}>{l}</button>
        ))}
        <button type="button" className="line" onClick={endAll}>Sign everyone else out</button>
      </div>
      {!d ? <p className="center muted">Loading...</p> : !d.rows.length ? <section className="card"><p className="center muted">Nobody seen in this period.</p></section> : (
        <section className="card">
          {d.rows.map((r) => (
            <div className="mrow" key={r.id}>
              <span className="grow">
                <b>{r.full_name || r.email}</b>{r.id === d.me ? ' (you)' : ''}<br />
                <span className="muted">{r.email} &middot; {who(r)} &middot; {r.iface || 'unknown'} &middot; {r.hits} requests &middot; {ago(r.ago)}</span>
              </span>
              {r.id === d.me ? null : <button type="button" className="line" onClick={() => end(r)}>Sign out</button>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
