import { useCallback, useEffect, useState } from 'react';
import { get } from './http.js';

const RANGES = [['1', 'Last 24 hours'], ['7', 'Last 7 days'], ['30', 'Last 30 days']];
const when = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false });
};
const dur = (m) => (m >= 120 ? Math.round(m / 60) + ' hours' : m + ' minutes');

export default function DevUptime() {
  const [days, setDays] = useState('7');
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(async (n) => {
    setErr('');
    try { setD(await get('/v1/dev/system/uptime?days=' + n)); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(days); const t = setInterval(() => load(days), 60000); return () => clearInterval(t); }, [days, load]);

  const last = d && d.last;
  const ageMin = last ? Math.round((Date.now() - new Date(last.at).getTime()) / 60000) : null;
  const up = last && last.ok && ageMin < 3;
  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <h1 className="center">Uptime and alerts</h1>
      <p className="center muted">The backend checks the database every minute. Refreshes by itself.</p>
      {err ? <p className="err center">{err}</p> : null}
      <div className="actbar" style={{ justifyContent: 'center' }}>
        {RANGES.map(([v, l]) => <button key={v} type="button" className={days === v ? 'btn' : 'line'} onClick={() => setDays(v)}>{l}</button>)}
        <button type="button" className="line" onClick={() => load(days)}>Refresh</button>
      </div>
      {!d ? <p className="center muted">Loading...</p> : !d.total ? (
        <section className="card"><p className="center muted">No checks yet. The first one is written about a minute after the backend starts. Tap Refresh then.</p></section>
      ) : (
        <>
          <section className="card">
            <h2 style={{ color: up ? '#0a7a2f' : '#b00020' }}>{up ? 'Everything is up' : 'Needs a look'}</h2>
            <div className="mrow"><span className="grow">Last check</span><b>{ageMin} min ago{last.ok ? '' : ' (database failed)'}</b></div>
            <div className="mrow"><span className="grow">Uptime in this period</span><b>{d.pct}%</b></div>
            <div className="mrow"><span className="grow">Database answer time (average / slowest)</span><b>{d.avgMs} ms / {d.maxMs} ms</b></div>
            <div className="mrow"><span className="grow">Restarts or wake-ups</span><b>{d.restarts}</b></div>
          </section>
          <section className="card">
            <h2>Last 90 checks</h2>
            <p className="muted">Green is fine, gold is slow, red failed.</p>
            <div style={{ display: 'flex', gap: '2px' }}>
              {d.recent.map((r, i) => (
                <div key={i} title={when(r.at) + ': ' + (r.ok ? r.dbMs + ' ms' : 'failed')}
                  style={{ flex: 1, height: '30px', borderRadius: '2px', background: !r.ok ? '#b00020' : r.dbMs > 1500 ? '#c9a227' : '#0a7a2f' }} />
              ))}
            </div>
          </section>
          <section className="card">
            <h2>Incidents</h2>
            {!d.incidents.length ? <p className="muted">None in this period.</p> : d.incidents.map((x, i) => (
              <div className="mrow" key={i}>
                {x.type === 'db'
                  ? <span className="grow"><b style={{ color: '#b00020' }}>Database check failed</b> &middot; {when(x.at)}{x.note ? ' \u00b7 ' + x.note : ''}</span>
                  : <span className="grow"><b style={{ color: '#a15c00' }}>No heartbeat for {dur(x.minutes)}</b> &middot; {when(x.from)} to {when(x.to)} (asleep, restarted or down)</span>}
              </div>
            ))}
          </section>
          <section className="card">
            <h2>Alerts</h2>
            <p className="muted">This page is the record. Your free external uptime monitor (set up in Phase 11) is what emails you when the site stops answering, because a sleeping backend cannot email itself.</p>
          </section>
        </>
      )}
    </div>
  );
}
