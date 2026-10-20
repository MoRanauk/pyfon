import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from './http.js';

const D = '/v1/dev/system';
const RANGES = [['24', 'Last 24 hours'], ['72', 'Last 3 days'], ['168', 'Last 7 days']];
const W = 720;
const H = 150;
const scol = (s) => (s >= 500 ? '#b00020' : s >= 400 ? '#a15c00' : '#0a7a2f');
const stamp = (iso, long) => {
  const d = new Date(iso);
  const t = d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false });
  return long ? d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) + ' ' + t : t;
};

function Axis({ rows, long }) {
  const step = Math.max(1, Math.ceil(rows.length / 8));
  const bw = W / rows.length;
  return rows.map((r, i) => (i % step === 0 ? <text key={i} x={i * bw} y={H + 16} fontSize="10" fill="#666">{stamp(r.hour, long)}</text> : null));
}

function Bars({ rows, long }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  const bw = W / rows.length;
  return (
    <svg viewBox={'0 0 ' + W + ' ' + (H + 22)} style={{ width: '100%' }} role="img" aria-label="Requests per hour">
      <text x="0" y="10" fontSize="10" fill="#666">{max} max</text>
      {rows.map((r, i) => {
        const th = (r.total / max) * H;
        const bad = r.serverErrors + r.clientErrors;
        const eh = (bad / max) * H;
        return (
          <g key={i}>
            <title>{stamp(r.hour, true) + ': ' + r.total + ' requests, ' + bad + ' errors, ' + r.avgMs + ' ms average'}</title>
            <rect x={i * bw + 1} y={H - th} width={Math.max(1, bw - 2)} height={th} fill="#0b2a4a" />
            {bad ? <rect x={i * bw + 1} y={H - eh} width={Math.max(1, bw - 2)} height={eh} fill="#b00020" /> : null}
          </g>
        );
      })}
      <line x1="0" y1={H} x2={W} y2={H} stroke="#999" />
      <Axis rows={rows} long={long} />
    </svg>
  );
}

function Lines({ rows, long }) {
  const max = Math.max(1, ...rows.map((r) => r.maxMs));
  const bw = W / rows.length;
  const pts = (k) => rows.map((r, i) => (i * bw + bw / 2).toFixed(1) + ',' + (H - (r[k] / max) * H).toFixed(1)).join(' ');
  return (
    <svg viewBox={'0 0 ' + W + ' ' + (H + 22)} style={{ width: '100%' }} role="img" aria-label="Response time per hour">
      <text x="0" y="10" fontSize="10" fill="#666">{max} ms</text>
      <polyline points={pts('maxMs')} fill="none" stroke="#c9a227" strokeWidth="1.5" />
      <polyline points={pts('avgMs')} fill="none" stroke="#0b2a4a" strokeWidth="2" />
      {rows.map((r, i) => <circle key={i} cx={i * bw + bw / 2} cy={H - (r.avgMs / max) * H} r="6" fill="transparent"><title>{stamp(r.hour, true) + ': ' + r.avgMs + ' ms average, ' + r.maxMs + ' ms slowest'}</title></circle>)}
      <line x1="0" y1={H} x2={W} y2={H} stroke="#999" />
      <Axis rows={rows} long={long} />
    </svg>
  );
}

function Meter({ label, n, total, color, to }) {
  const pct = total ? Math.max(2, Math.round((n / total) * 100)) : 0;
  const text = to ? <Link to={to} title="What does this mean?" style={{ color, fontWeight: 700 }}>{label}</Link> : <b>{label}</b>;
  return (
    <div style={{ margin: '6px 0' }}>
      <div className="mrow"><span className="grow">{text}</span><span>{n}</span></div>
      <div style={{ background: '#eee', borderRadius: '4px', height: '8px' }}><div style={{ width: pct + '%', background: color, height: '8px', borderRadius: '4px' }} /></div>
    </div>
  );
}

export default function DevGraphs() {
  const [hours, setHours] = useState('24');
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(async (h) => {
    setErr('');
    try { setD(await get(D + '/graphs?hours=' + (h || hours))); } catch (e) { setErr(e.message); }
  }, [hours]);
  useEffect(() => { load(hours); const t = setInterval(() => load(hours), 60000); return () => clearInterval(t); }, [hours, load]);

  const total = d ? d.series.reduce((a, r) => a + r.total, 0) : 0;
  const bad = d ? d.series.reduce((a, r) => a + r.serverErrors + r.clientErrors, 0) : 0;
  const srv = d ? d.series.reduce((a, r) => a + r.serverErrors, 0) : 0;
  const peak = d && total ? d.series.reduce((a, r) => (r.total > a.total ? r : a), d.series[0]) : null;
  const long = hours !== '24';
  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <h1 className="center">Traffic graphs</h1>
      <p className="center muted">Refreshes by itself every minute. Tap a status number to see what it means.</p>
      {err ? <p className="err center">{err}</p> : null}
      <div className="actbar" style={{ justifyContent: 'center' }}>
        {RANGES.map(([v, l]) => <button key={v} type="button" className={hours === v ? 'btn' : 'line'} onClick={() => setHours(v)}>{l}</button>)}
        <button type="button" className="line" onClick={() => load(hours)}>Refresh</button>
      </div>
      {!d ? <p className="center muted">Loading...</p> : !total ? (
        <section className="card"><p className="center muted">No traffic recorded in this period yet. Use a shop for a minute, then tap Refresh.</p></section>
      ) : (
        <>
          <section className="card">
            <div className="mrow"><span className="grow">Requests</span><b>{total}</b></div>
            <div className="mrow"><span className="grow">Errors (400 and up)</span><b style={{ color: bad ? '#a15c00' : '#0a7a2f' }}>{bad} ({Math.round((bad / total) * 100)}%)</b></div>
            <div className="mrow"><span className="grow">Server errors (500 and up)</span><b style={{ color: srv ? '#b00020' : '#0a7a2f' }}>{srv}</b></div>
            <div className="mrow"><span className="grow">Slowest 5% took longer than</span><b>{d.p95Ms} ms</b></div>
            {peak ? <div className="mrow"><span className="grow">Busiest hour</span><b>{stamp(peak.hour, true)} ({peak.total})</b></div> : null}
          </section>
          <section className="card">
            <h2>Requests per hour</h2>
            <p className="muted">Navy is all requests. Red is the part that failed.</p>
            <Bars rows={d.series} long={long} />
          </section>
          <section className="card">
            <h2>Response time</h2>
            <p className="muted">Navy is the average, gold is the slowest in that hour.</p>
            <Lines rows={d.series} long={long} />
          </section>
          <section className="card">
            <h2>Status numbers</h2>
            {d.statuses.map((s) => <Meter key={s.status} label={String(s.status)} n={s.n} total={total} color={scol(s.status)} to={'/errors?q=' + s.status} />)}
          </section>
          <section className="card">
            <h2>By interface</h2>
            {d.interfaces.map((i) => <Meter key={i.iface} label={i.iface + (i.errors ? ' (' + i.errors + ' errors)' : '')} n={i.n} total={total} color="#0b2a4a" />)}
          </section>
          <section className="card">
            <h2>Busiest routes</h2>
            {d.routes.map((r, i) => <div className="mrow" key={i}><span className="grow">{r.method} {r.path}</span><span>{r.n}x &middot; {r.avgMs} ms{r.errors ? ' \u00b7 ' + r.errors + ' errors' : ''}</span></div>)}
          </section>
        </>
      )}
    </div>
  );
}
