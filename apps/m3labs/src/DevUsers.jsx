import { useEffect, useState } from 'react';
import { get, post } from './http.js';
import UserTable from './UserTable.jsx';

const D = '/v1/dev/system';
const GROUPS = [['partner', 'Partners'], ['vendor', 'Dealers'], ['customer', 'Customers'], ['developer', 'Developer']];
const SINGULAR = { customer: 'customer', partner: 'partner', vendor: 'dealer', developer: 'developer' };
const monthName = (m) => new Date(m + '-15').toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });

export default function DevUsers() {
  const [group, setGroup] = useState('partner');
  const [month, setMonth] = useState('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [months, setMonths] = useState([]);
  const [help, setHelp] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load(g = group, m = month, s = q) {
    setErr('');
    try {
      const d = await get(D + '/users?role=' + g + '&q=' + encodeURIComponent(s) + (g === 'customer' && m ? '&month=' + m : ''));
      setRows(d.users);
      setMonths(d.months || []);
    } catch (e) { setErr(e.message); }
  }
  async function loadHelp() {
    try { setHelp((await get(D + '/password-help')).requests); } catch (e) { /* table may not exist yet */ }
  }
  useEffect(() => { load(); loadHelp(); }, []); // eslint-disable-line

  function pick(g) { setGroup(g); setMonth(''); setRows(null); load(g, '', q); }
  function pickMonth(m) { setMonth(m); load(group, m, q); }

  async function run(path, body, ask, ok) {
    if (ask && !window.confirm(ask)) return;
    setErr(''); setMsg('');
    try { const d = await post(D + path, body); setMsg(typeof ok === 'function' ? ok(d) : ok); load(); loadHelp(); } catch (e) { setErr(e.message); }
  }
  function onAct(u, what) {
    if (what === 'temp') return run('/users/' + u.id + '/temp-password', {}, 'Email a new temporary password to ' + u.name + '? Their old password stops working.', (d) => 'Sent to ' + d.sentTo + '. It may land in spam.');
    if (what === 'out') return run('/users/' + u.id + '/sign-out', {}, 'Sign ' + u.name + ' out everywhere?', 'Signed out.');
    return run('/users/' + u.id + '/active', { active: !u.active }, (u.active ? 'Switch off ' : 'Switch on ') + u.name + '?', u.active ? 'Switched off.' : 'Switched on.');
  }
  return (
    <div style={{ maxWidth: '980px', margin: '0 auto' }}>
      <h1 className="center">Users</h1>
      <p className="center muted">Temporary passwords are emailed to the person. You never see them.</p>
      {msg ? <p className="ok center">{msg}</p> : null}
      {err ? <p className="err center">{err}</p> : null}

      {help.length ? (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Password help requests ({help.length})</h3>
          {help.map((r) => (
            <div className="mrow" key={r.id}>
              <span className="grow"><b>{r.name || r.email}</b><br /><span className="muted">{r.email} &middot; {new Date(r.createdAt).toLocaleString('en-KE')}{r.note ? ' \u00b7 ' + r.note : ''}</span></span>
              {r.userId ? <button type="button" className="line sm" onClick={() => run('/users/' + r.userId + '/temp-password', { requestId: r.id }, 'Email a temporary password to ' + r.email + '?', (d) => 'Sent to ' + d.sentTo + '.')}>Send temporary password</button> : <span className="muted">no account with this email</span>}
              <button type="button" className="line sm" onClick={() => run('/password-help/' + r.id + '/done', {}, null, 'Closed.')}>Close</button>
            </div>
          ))}
        </section>
      ) : null}

      <section className="card">
        <div className="actbar" style={{ flexWrap: 'wrap' }}>
          {GROUPS.map(([k, label]) => (
            <button key={k} type="button" className={group === k ? 'btn' : 'line'} onClick={() => pick(k)}>{label}</button>
          ))}
        </div>
        <div className="actbar" style={{ flexWrap: 'wrap' }}>
          {group === 'customer' ? (
            <select value={month} onChange={(e) => pickMonth(e.target.value)}>
              <option value="">All months</option>
              {months.map((m) => <option key={m.m} value={m.m}>{monthName(m.m)} ({m.n})</option>)}
            </select>
          ) : null}
          <input placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
          <button type="button" onClick={() => load()}>Show</button>
        </div>
        <p className="muted">Sign everyone out of:{' '}
          {['partner', 'vendor', 'customer'].map((r) => (
            <button key={r} type="button" className="line sm" onClick={() => run('/users/sign-out-all', { role: r }, 'Sign out ALL ' + SINGULAR[r] + 's? They must sign in again.', (d) => d.count + ' accounts signed out.')}>{SINGULAR[r]}s</button>
          ))}
        </p>
      </section>
      <section className="card">
        {!rows ? <p className="center muted">Loading...</p> : <UserTable rows={rows} onAct={onAct} />}
      </section>
    </div>
  );
}
