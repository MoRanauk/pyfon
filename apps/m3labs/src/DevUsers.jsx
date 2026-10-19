import { useEffect, useState } from 'react';
import { get, post } from './http.js';

const D = '/v1/dev/system';
const ROLE = { customer: 'Customer', partner: 'Partner', vendor: 'Dealer', developer: 'Developer' };
const STAGES = { creative: 'Creative', production: 'Production', finance: 'Finance' };

export default function DevUsers() {
  const [role, setRole] = useState('all');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    try { setRows((await get(D + '/users?role=' + role + '&q=' + encodeURIComponent(q))).users); } catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function act(path, body, ask, ok) {
    if (ask && !window.confirm(ask)) return;
    setErr(''); setMsg('');
    try { const d = await post(D + path, body); setMsg(typeof ok === 'function' ? ok(d) : ok); load(); } catch (e) { setErr(e.message); }
  }
  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>
      <h1 className="center">Users</h1>
      <p className="center muted">Temporary passwords are emailed to the person. You never see them.</p>
      {msg ? <p className="ok center">{msg}</p> : null}
      {err ? <p className="err center">{err}</p> : null}
      <section className="card">
        <div className="actbar">
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="all">Everyone</option>
            {Object.entries(ROLE).map(([k, v]) => <option key={k} value={k}>{v}s</option>)}
          </select>
          <input placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="button" onClick={load}>Show</button>
        </div>
        <p className="muted">Sign everyone out of:{' '}
          {['partner', 'vendor', 'customer'].map((r) => (
            <button key={r} type="button" className="line sm" onClick={() => act('/users/sign-out-all', { role: r }, 'Sign out ALL ' + ROLE[r].toLowerCase() + 's? They must sign in again.', (d) => d.count + ' accounts signed out.')}>{ROLE[r]}s</button>
          ))}
        </p>
      </section>
      {!rows ? <p className="center muted">Loading...</p> : null}
      {rows ? rows.map((u) => (
        <section className="card" key={u.id}>
          <div className="mrow">
            <span className="grow"><b>{u.name}</b> {u.active ? null : <span className="badge">switched off</span>} {u.mustChange ? <span className="badge">temporary password</span> : null}<br />
              <span className="muted">{ROLE[u.role]}{u.stage ? ' \u00b7 ' + STAGES[u.stage] : ''} &middot; {u.email} &middot; {u.phone || 'no phone'}<br />
                last sign-in: {u.lastLogin ? new Date(u.lastLogin).toLocaleString('en-KE') : 'never'}</span></span>
          </div>
          {u.role !== 'developer' ? (
            <div>
              {['partner', 'vendor'].includes(u.role) ? <button type="button" className="line sm" onClick={() => act('/users/' + u.id + '/temp-password', {}, 'Email a new temporary password to ' + u.name + '? Their old password stops working.', (d) => 'Sent to ' + d.sentTo + '. It may land in spam.')}>Send temporary password</button> : null}
              <button type="button" className="line sm" onClick={() => act('/users/' + u.id + '/sign-out', {}, 'Sign ' + u.name + ' out everywhere?', 'Signed out.')}>Sign out</button>
              {['customer', 'vendor'].includes(u.role) ? <button type="button" className="danger sm" onClick={() => act('/users/' + u.id + '/active', { active: !u.active }, (u.active ? 'Switch off ' : 'Switch on ') + u.name + '?', u.active ? 'Switched off.' : 'Switched on.')}>{u.active ? 'Switch off' : 'Switch on'}</button> : null}
            </div>
          ) : null}
        </section>
      )) : null}
    </div>
  );
}
