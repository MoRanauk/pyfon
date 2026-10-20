import { useState } from 'react';
import { post } from './http.js';

const EXAMPLES = [
  ['All tables', "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1"],
  ['Latest jobs', 'SELECT ref, status, current_step, created_at FROM jobs ORDER BY created_at DESC LIMIT 20'],
  ['Answers by status', 'SELECT status, count(*) FROM request_log GROUP BY 1 ORDER BY 2 DESC'],
  ['Users by role', 'SELECT role, count(*) FROM users GROUP BY 1'],
];
const show = (v) => (v === null || v === undefined ? 'null' : typeof v === 'object' ? JSON.stringify(v) : String(v));

export default function DevSql() {
  const [sql, setSql] = useState(EXAMPLES[0][1]);
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function run() {
    setErr(''); setBusy(true); setD(null);
    try { setD(await post('/v1/dev/system/sql/run', { sql })); } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <div style={{ maxWidth: '980px', margin: '0 auto' }}>
      <h1 className="center">SQL console</h1>
      <p className="center muted">Read only. One SELECT at a time, 5 seconds, 200 rows. Secret columns are hidden. Every run is recorded in the audit log.</p>
      <div className="actbar" style={{ justifyContent: 'center' }}>
        {EXAMPLES.map(([l, q]) => <button key={l} type="button" className="line" onClick={() => setSql(q)}>{l}</button>)}
      </div>
      <textarea value={sql} onChange={(e) => setSql(e.target.value)} rows={5} spellCheck={false}
        style={{ width: '100%', fontFamily: 'monospace', boxSizing: 'border-box' }} />
      <div className="actbar" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn" disabled={busy} onClick={run}>{busy ? 'Running...' : 'Run'}</button>
      </div>
      {err ? <p className="err center">{err}</p> : null}
      {d ? (
        <section className="card">
          <p className="muted">{d.rows.length} rows{d.truncated ? ' (more were cut off)' : ''} &middot; {d.ms} ms</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead><tr>{d.columns.map((c, i) => <th key={i} style={{ textAlign: 'left', padding: '4px 10px', borderBottom: '1px solid #ccc' }}>{c}</th>)}</tr></thead>
              <tbody>{d.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} style={{ padding: '4px 10px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>{show(v)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
