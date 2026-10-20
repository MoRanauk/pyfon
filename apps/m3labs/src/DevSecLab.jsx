import { useState } from 'react';
import { get, post } from './http.js';

const B = '/v1/dev/system/sec/';
const COL = { pass: '#0a7a2f', warn: '#a15c00', fail: '#b00020' };
const hr = (iso) => new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false });

function Access({ d }) {
  const bad = d.rows.reduce((a, r) => a + r.cells.filter((c) => c.ok === false).length, 0);
  return (
    <>
      <section className="card">
        <h2 style={{ color: bad ? COL.fail : COL.pass }}>{bad ? bad + ' wrong answer' + (bad > 1 ? 's' : '') : 'Every role got the right answer'}</h2>
        <p className="muted">Checked at {hr(d.at)}. Green means correct: the owner role gets in, everyone else is turned away.</p>
        {d.missing.length ? <p className="muted">No test account for: {d.missing.join(', ')}. Those cells are skipped.</p> : null}
      </section>
      {d.rows.map((r) => (
        <section className="card" key={r.path}>
          <b>{r.path}</b><br /><span className="muted">Only {r.owner}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            {r.cells.map((c) => (
              <span key={c.role} style={{ color: c.ok === null ? '#666' : c.ok ? COL.pass : COL.fail }}>
                {c.role} {c.status === null ? 'skipped' : c.status}{c.ok === false && c.role === r.owner && c.status === 404 ? ' (route not found)' : ''}
              </span>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function Pen({ d }) {
  const bad = d.results.filter((c) => c.level === 'fail').length;
  const warn = d.results.filter((c) => c.level === 'warn').length;
  return (
    <>
      <section className="card"><h2 style={{ color: bad ? COL.fail : warn ? COL.warn : COL.pass }}>{bad ? bad + ' to fix' : warn ? 'Good, ' + warn + ' skipped' : 'All attacks were stopped'}</h2></section>
      <section className="card">
        {d.results.map((c, i) => (
          <div className="mrow" key={i}>
            <b style={{ color: COL[c.level], width: '3.2em' }}>{c.level.toUpperCase()}</b>
            <span className="grow">{c.name}<br /><span className="muted">{c.detail}</span></span>
          </div>
        ))}
      </section>
    </>
  );
}

export default function DevSecLab({ kind }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ham, setHam] = useState(false);
  async function run() {
    setErr(''); setBusy(true); setD(null);
    try { setD(kind === 'access' ? await get(B + 'access') : await post(B + 'pentest', { hammer: ham })); } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <h1 className="center">{kind === 'access' ? 'Access matrix test' : 'Pen-test lab'}</h1>
      <p className="center muted">
        {kind === 'access'
          ? 'Calls safe routes as each kind of person and checks that only the right role gets in.'
          : 'Attacks only our own backend: fake tokens, role jumping, bad input. Every run is recorded in the audit log.'}
      </p>
      {kind === 'pentest' ? (
        <p className="center">
          <label><input type="checkbox" checked={ham} onChange={(e) => setHam(e.target.checked)} /> Also test the login rate limit (this computer cannot sign in for up to 15 minutes afterwards)</label>
        </p>
      ) : null}
      {err ? <p className="err center">{err}</p> : null}
      <div className="actbar" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn" disabled={busy} onClick={run}>{busy ? 'Running...' : kind === 'access' ? 'Run matrix' : 'Run tests'}</button>
      </div>
      {!d ? <p className="center muted">{busy ? 'Working...' : 'Nothing run yet.'}</p> : kind === 'access' ? <Access d={d} /> : <Pen d={d} />}
    </div>
  );
}
