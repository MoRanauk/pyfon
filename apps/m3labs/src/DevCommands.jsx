import { useEffect, useState } from 'react';
import { get, post } from './http.js';

const B = '/v1/dev/system/commands';

export default function DevCommands() {
  const [list, setList] = useState(null);
  const [out, setOut] = useState({});
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { get(B).then((d) => setList(d.commands)).catch((e) => setErr(e.message)); }, []);
  async function run(c) {
    setErr(''); setBusy(c.id);
    try { const d = await post(B + '/' + c.id + '/run'); setOut((o) => ({ ...o, [c.id]: d })); } catch (e) { setErr(e.message); }
    setBusy('');
  }
  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <h1 className="center">Commands</h1>
      <p className="center muted">A fixed list of safe checks. They only look, they never change anything. Each run is recorded in the audit log.</p>
      {err ? <p className="err center">{err}</p> : null}
      {!list ? <p className="center muted">Loading...</p> : list.map((c) => (
        <section className="card" key={c.id}>
          <div className="mrow">
            <span className="grow"><b>{c.label}</b><br /><span className="muted">{c.about}</span></span>
            <button type="button" className="btn" disabled={busy === c.id} onClick={() => run(c)}>{busy === c.id ? 'Running...' : 'Run'}</button>
          </div>
          {out[c.id] ? <pre style={{ whiteSpace: 'pre-wrap', fontSize: '13px', margin: '8px 0 0' }}>{out[c.id].lines.join('\n')}</pre> : null}
        </section>
      ))}
    </div>
  );
}
