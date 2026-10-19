import { useRef, useState } from 'react';
import { P } from './api.js';
import { get, post } from './http.js';

export default function CsvImport() {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [over, setOver] = useState(false);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const pick = useRef(null);
  const body = () => ({ csv: text, overwrite: over, fileName: name || 'products.csv' });

  function onFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setErr(''); setMsg(''); setRes(null); setName(f.name);
    const r = new FileReader();
    r.onload = () => setText(String(r.result));
    r.readAsText(f);
  }
  async function run(kind, fn) {
    setBusy(kind); setErr(''); setMsg('');
    try { await fn(); } catch (e) { setErr((e && e.message) || 'Something went wrong'); }
    setBusy('');
  }
  const check = () => run('check', async () => setRes(await post(P + '/csv/check', body())));
  const submit = () => run('submit', async () => {
    const b = await post(P + '/csv/submit', body());
    await post(P + '/approvals', { action: 'csv_import', payload: { batchId: b.batchId } });
    setMsg('Sent for approval. The other two partners must approve it on the Approvals page.');
    setRes(null); setText(''); setName('');
    if (pick.current) pick.current.value = '';
  });
  const download = () => run('export', async () => {
    const d = await get(P + '/csv/export');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([d.csv], { type: 'text/csv;charset=utf-8' }));
    a.download = d.fileName;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
  });

  const ok = res && !res.fatal && !res.errors.length;
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <h1 className="center">Product file (CSV)</h1>
      <p className="center muted">Upload your product list, check it, then send it for approval by all three partners.</p>
      {msg ? <p className="ok center">{msg}</p> : null}
      {err ? <p className="err center">{err}</p> : null}
      <section className="card">
        <h2>1. Choose the file</h2>
        <input ref={pick} type="file" accept=".csv,text/csv" onChange={onFile} />
        {name ? <p className="muted">{name}</p> : null}
        <label><input type="checkbox" checked={over} onChange={(e) => setOver(e.target.checked)} /> Also overwrite products edited in Product Manager</label>
        <button type="button" disabled={!text || !!busy} onClick={check}>{busy === 'check' ? 'Checking...' : 'Check file (changes nothing)'}</button>
      </section>
      {res ? (
        <section className="card">
          <h2>2. Result</h2>
          {res.fatal ? <p className="err">{res.fatal}</p> : <p>{res.rows} rows checked. {res.errors.length} errors.</p>}
          {res.errors.slice(0, 100).map((e, i) => <p className="err" key={i}>Row {e.row} ({e.sku || 'no sku'}): {e.message}</p>)}
          {res.errors.length > 100 ? <p className="muted">and {res.errors.length - 100} more errors</p> : null}
          {ok ? <p>Would create {res.create} and update {res.update}.</p> : null}
          {ok && res.skipped.length ? <p className="muted">Skipped because they were edited in Product Manager: {res.skipped.join(', ')}</p> : null}
          {ok && res.create + res.update > 0 ? <button type="button" disabled={!!busy} onClick={submit}>{busy === 'submit' ? 'Sending...' : 'Send for approval'}</button> : null}
        </section>
      ) : null}
      <section className="card">
        <h2>Export</h2>
        <p className="muted">Download every product in the same CSV format.</p>
        <button type="button" disabled={!!busy} onClick={download}>{busy === 'export' ? 'Preparing...' : 'Download CSV'}</button>
      </section>
    </div>
  );
}
