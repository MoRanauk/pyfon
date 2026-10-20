import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from './http.js';

const D = '/v1/dev/system';
const KINDS = [['errors', 'Errors (400 and up)'], ['server', 'Server errors (500 and up)'], ['slow', 'Slow (over 1 second)'], ['all', 'Everything']];
const SHOPS = ['', 'mco', 'prestige', 'trim', 'm3-creative', 'm3-production', 'm3-finance', 'dev', 'vendor'];
const when = (d) => new Date(d).toLocaleString('en-KE');
const color = (s) => (s >= 500 ? '#b00020' : s >= 400 ? '#a15c00' : '#0a7a2f');

export default function DevLogs() {
  const [f, setF] = useState({ kind: 'errors', interface: '', q: '', hours: '24' });
  const [rows, setRows] = useState(null);
  const [tid, setTid] = useState('');
  const [tr, setTr] = useState(null);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function load() {
    setErr('');
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, v); });
    try { setRows((await get(D + '/requests?' + p.toString())).rows); } catch (e) { setErr(e.message); }
  }
  async function trace(id) {
    setErr(''); setTid(id); setTr(null);
    try { setTr(await get(D + '/trace/' + encodeURIComponent(id.trim()))); } catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <h1 className="center">Logs and traces</h1>
      <p className="center muted">Find what failed, then follow one request from start to finish.</p>
      {err ? <p className="err center">{err}</p> : null}
      <section className="card">
        <div className="actbar">
          <select value={f.kind} onChange={set('kind')}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select value={f.interface} onChange={set('interface')}>{SHOPS.map((s) => <option key={s} value={s}>{s || 'All interfaces'}</option>)}</select>
          <select value={f.hours} onChange={set('hours')}><option value="1">Last hour</option><option value="24">Last 24 hours</option><option value="168">Last 7 days</option></select>
          <input placeholder="Part of the path, e.g. /orders" value={f.q} onChange={set('q')} />
          <button type="button" onClick={load}>Show</button>
        </div>
      </section>
      <section className="card">
        <h2>Trace one request</h2>
        <input placeholder="Paste a request ID" value={tid} onChange={(e) => setTid(e.target.value)} />
        <button type="button" disabled={tid.trim().length < 4} onClick={() => trace(tid)}>Trace</button>
        {tr ? (
          <div>
            <p className="muted">{tr.requests.length} request line(s), {tr.audit.length} audit line(s)</p>
            {tr.requests.map((r, i) => <p key={i}><Link to={'/errors?q=' + r.status} title="What does this mean?" style={{ color: color(r.status), fontWeight: 700 }}>{r.status}</Link> {r.method} {r.path} &middot; {r.ms} ms &middot; {r.interface} &middot; {when(r.at)}</p>)}
            {tr.audit.map((a, i) => <p key={i} className="muted">{a.actor || 'Someone'}: {a.action} {a.entity_type || ''} {a.entity_id || ''} {JSON.stringify(a.details)}</p>)}
          </div>
        ) : null}
      </section>
      {!rows ? <p className="center muted">Loading...</p> : null}
      {rows && !rows.length ? <p className="center muted">Nothing found for this filter.</p> : null}
      {rows ? rows.map((r) => (
        <div className="actrow" key={r.id}>
          <span className="actwhen">{when(r.at)}<br /><span className="muted">{r.iface || ''}</span></span>
          <span><Link to={'/errors?q=' + r.status} title="What does this mean?" style={{ color: color(r.status), fontWeight: 700 }}>{r.status}</Link> {r.method} {r.path} &middot; {r.ms} ms{r.who ? ' \u00b7 ' + r.who : ''}<br />
            <button type="button" className="linkbtn" onClick={() => trace(r.requestId)}>Trace {r.requestId}</button></span>
        </div>
      )) : null}
    </div>
  );
}
