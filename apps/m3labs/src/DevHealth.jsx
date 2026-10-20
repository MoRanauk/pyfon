import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from './http.js';

const D = '/v1/dev/system';
const up = (s) => (s >= 3600 ? Math.floor(s / 3600) + ' h ' + Math.floor((s % 3600) / 60) + ' min' : Math.floor(s / 60) + ' min');
const tag = (ok) => <b style={{ color: ok ? '#0a7a2f' : '#b00020' }}>{ok ? 'OK' : 'PROBLEM'}</b>;

export default function DevHealth() {
  const [h, setH] = useState(null);
  const [t, setT] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    setErr('');
    try { const [a, b] = await Promise.all([get(D + '/health'), get(D + '/traffic')]); setH(a); setT(b); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>
      <h1 className="center">System health</h1>
      <p className="center"><button type="button" onClick={load}>Refresh</button></p>
      {err ? <p className="err center">{err}</p> : null}
      {!h ? <p className="center muted">Loading...</p> : (
        <>
          <section className="card">
            <h2>Server</h2>
            <p>Database: {tag(h.database.ok)} {h.database.ok ? h.database.ms + ' ms, ' + h.database.sizeMb + ' MB stored' : ''}</p>
            <p>WhatsApp (OpenWA): {tag(h.openwa.ok)} <span className="muted">{h.openwa.note}</span></p>
            <p className="muted">Node {h.server.node} &middot; up {up(h.server.uptimeSeconds)} since the last restart &middot; memory {h.server.memoryMb} MB &middot; {h.server.env}</p>
            {h.last24h ? <p>Last 24 hours: <b>{h.last24h.total}</b> requests, <b>{h.last24h.serverErrors}</b> server errors, {h.last24h.clientErrors} client errors, average {h.last24h.avgMs} ms</p> : <p className="muted">No request log yet.</p>}
          </section>
          <section className="card">
            <h2>In the system</h2>
            {h.counts.map((c) => <div className="mrow" key={c.label}><span className="grow">{c.label}</span><b>{c.n === null ? 'n/a' : c.n}</b></div>)}
          </section>
          <section className="card">
            <h2>Settings in .env (names only)</h2>
            {h.config.map((c) => <div className="mrow" key={c.name}><span className="grow">{c.name}</span><b style={{ color: c.set ? '#0a7a2f' : '#b00020' }}>{c.set ? 'set' : 'missing'}</b></div>)}
            <p className="muted">SMS_GATEWAY_*, SITE_URL and SENTRY_DSN may stay missing until we deploy.</p>
          </section>
        </>
      )}
      {t ? (
        <>
          <section className="card">
            <h2>Traffic, last 24 hours</h2>
            {!t.interfaces.length ? <p className="muted">Nothing recorded.</p> : null}
            {t.interfaces.map((i) => <div className="mrow" key={i.iface}><span className="grow"><b>{i.iface}</b></span><span>{i.hour} in the last hour &middot; {i.day} today &middot; {i.errors} errors &middot; {i.avgMs} ms</span></div>)}
          </section>
          <section className="card">
            <h2>Slowest requests</h2>
            {t.slow.map((s, i) => <div className="mrow" key={i}><span className="grow">{s.method} {s.path}</span><span>{s.avgMs} ms avg &middot; {s.maxMs} max &middot; {s.n}x</span></div>)}
          </section>
          <section className="card">
            <h2>Most common errors</h2>
            {!t.bad.length ? <p className="muted">No errors. Good.</p> : null}
            {t.bad.map((s, i) => <div className="mrow" key={i}><span className="grow"><Link to={'/errors?q=' + s.status} title="What does this mean?">{s.status}</Link> {s.method} {s.path}</span><span>{s.n}x</span></div>)}
          </section>
        </>
      ) : null}
    </div>
  );
}
