import { useCallback, useEffect, useState } from 'react';
import { get } from './http.js';

const B = '/v1/dev/system/sec/';
const COL = { pass: '#0a7a2f', warn: '#a15c00', fail: '#b00020' };
const SEV = { critical: '#b00020', high: '#b00020', moderate: '#a15c00', low: '#666', info: '#666' };
const TITLE = { scan: 'Security scan', logins: 'Login attacks', deps: 'Dependency audit', secrets: 'Secrets watch' };
const INFO = {
  scan: 'Your backend tests itself: headers, CORS, sign-in rules and secret strength.',
  logins: 'Failed and blocked sign-in attempts from the request log. A sudden spike means someone is guessing passwords.',
  deps: 'Checks the libraries we use against the public list of known weaknesses. Needs the internet.',
  secrets: 'Looks through the project files for passwords or keys written where they should not be. Values are never shown.',
};
const hr = (iso) => new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) + ' ' + new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false });

function Scan({ d }) {
  const bad = d.checks.filter((c) => c.level === 'fail').length;
  const warn = d.checks.filter((c) => c.level === 'warn').length;
  return (
    <>
      <section className="card"><h2 style={{ color: bad ? COL.fail : warn ? COL.warn : COL.pass }}>{bad ? bad + ' to fix' : warn ? 'Good, ' + warn + ' to watch' : 'All clear'}</h2></section>
      <section className="card">
        {d.checks.map((c, i) => (
          <div className="mrow" key={i}>
            <b style={{ color: COL[c.level], width: '3.2em' }}>{c.level.toUpperCase()}</b>
            <span className="grow">{c.name}<br /><span className="muted">{c.detail}</span></span>
          </div>
        ))}
      </section>
    </>
  );
}

function Logins({ d }) {
  const sum = (k) => d.series.reduce((a, r) => a + r[k], 0);
  const max = Math.max(1, ...d.series.map((r) => r.failed + r.blocked));
  return (
    <>
      <section className="card">
        <div className="mrow"><span className="grow">Successful sign-ins</span><b>{sum('ok')}</b></div>
        <div className="mrow"><span className="grow">Failed attempts</span><b style={{ color: sum('failed') ? COL.warn : COL.pass }}>{sum('failed')}</b></div>
        <div className="mrow"><span className="grow">Blocked by the rate limit</span><b>{sum('blocked')}</b></div>
      </section>
      <section className="card">
        <h2>Failed attempts per hour</h2>
        {!d.series.length ? <p className="muted">No sign-in attempts in this period.</p> : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '90px' }}>
            {d.series.map((r, i) => (
              <div key={i} title={hr(r.hour) + ': ' + r.failed + ' failed, ' + r.blocked + ' blocked'}
                style={{ flex: 1, minHeight: '2px', height: Math.max(2, ((r.failed + r.blocked) / max) * 90) + 'px', background: r.blocked ? COL.fail : r.failed ? COL.warn : '#ccc' }} />
            ))}
          </div>
        )}
      </section>
      <section className="card">
        <h2>By interface</h2>
        {d.byInterface.map((r) => <div className="mrow" key={r.iface}><span className="grow">{r.iface}</span><span>{r.ok} ok &middot; {r.failed} failed &middot; {r.blocked} blocked</span></div>)}
      </section>
    </>
  );
}

function Deps({ d, run, busy }) {
  if (d.error) return <section className="card"><p className="err center">{d.error}</p></section>;
  if (d.empty) return <section className="card"><p className="center muted">No audit yet. Tap Run audit (takes up to a minute).</p></section>;
  const c = d.counts || {};
  return (
    <>
      <section className="card">
        <div className="mrow"><span className="grow">Checked</span><b>{hr(d.at)}</b></div>
        {['critical', 'high', 'moderate', 'low'].map((k) => <div className="mrow" key={k}><span className="grow">{k}</span><b style={{ color: c[k] ? SEV[k] : COL.pass }}>{c[k] || 0}</b></div>)}
      </section>
      {d.list.length ? (
        <section className="card">
          <h2>Libraries to look at</h2>
          {d.list.map((x) => <div className="mrow" key={x.name}><span className="grow"><b style={{ color: SEV[x.severity] }}>{x.severity}</b> {x.name}{x.direct ? ' (ours)' : ''}<br /><span className="muted">{x.fix}</span></span></div>)}
        </section>
      ) : <section className="card"><p className="center" style={{ color: COL.pass }}>No known weaknesses.</p></section>}
    </>
  );
}

function Secrets({ d }) {
  if (d.notHere) return <section className="card"><p className="center muted">The project files are not on this server. Run this page from your laptop.</p></section>;
  const ok = !d.hits.length && d.gitignoreOk && !(d.envTracked && d.envTracked.length);
  return (
    <>
      <section className="card">
        <h2 style={{ color: ok ? COL.pass : COL.fail }}>{ok ? 'Nothing found' : 'Needs a look'}</h2>
        <div className="mrow"><span className="grow">Files scanned</span><b>{d.scanned}</b></div>
        <div className="mrow"><span className="grow">.env is ignored by Git</span><b style={{ color: d.gitignoreOk ? COL.pass : COL.fail }}>{d.gitignoreOk ? 'Yes' : 'NO'}</b></div>
        <div className="mrow"><span className="grow">.env files committed to Git</span><b style={{ color: d.envTracked && d.envTracked.length ? COL.fail : COL.pass }}>{d.envTracked === null ? 'Could not check' : d.envTracked.length}</b></div>
      </section>
      {d.hits.length ? (
        <section className="card">
          <h2>Found in files</h2>
          <p className="muted">If a real secret was ever committed, rotate it (make a new one).</p>
          {d.hits.map((h, i) => <div className="mrow" key={i}><span className="grow"><b>{h.what}</b><br /><span className="muted">{h.file} line {h.line}</span></span></div>)}
        </section>
      ) : null}
    </>
  );
}

export default function DevSecurity({ kind }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [hours, setHours] = useState('72');
  const load = useCallback(async (extra) => {
    setErr(''); setBusy(true);
    try { setD(await get(B + kind + '?hours=' + hours + (extra || ''))); } catch (e) { setErr(e.message); }
    setBusy(false);
  }, [kind, hours]);
  useEffect(() => { setD(null); load(''); }, [load]);
  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <h1 className="center">{TITLE[kind]}</h1>
      <p className="center muted">{INFO[kind]}</p>
      {err ? <p className="err center">{err}</p> : null}
      <div className="actbar" style={{ justifyContent: 'center' }}>
        {kind === 'logins' ? [['24', '24 hours'], ['72', '3 days'], ['168', '7 days']].map(([v, l]) => <button key={v} type="button" className={hours === v ? 'btn' : 'line'} onClick={() => setHours(v)}>{l}</button>) : null}
        {kind === 'deps' ? <button type="button" className="btn" disabled={busy} onClick={() => load('&fresh=1')}>{busy ? 'Running...' : 'Run audit'}</button>
          : <button type="button" className="line" disabled={busy} onClick={() => load('')}>{kind === 'scan' ? 'Run scan again' : 'Refresh'}</button>}
      </div>
      {!d ? <p className="center muted">Loading...</p> : kind === 'scan' ? <Scan d={d} /> : kind === 'logins' ? <Logins d={d} /> : kind === 'deps' ? <Deps d={d} /> : <Secrets d={d} />}
    </div>
  );
}
