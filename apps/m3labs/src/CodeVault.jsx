import { useEffect, useState } from 'react';
import { get, post, call } from './http.js';

const B = '/v1/dev/system/vault';
const grp = (p) => p.split('/').slice(0, /^(apps|packages)\//.test(p) ? 2 : 1).join('/');
const box = { border: '1px solid #d5dbe5', borderRadius: 10, padding: 12, background: '#fff' };

export default function CodeVault() {
  const [list, setList] = useState(null);
  const [snap, setSnap] = useState(null);
  const [pass, setPass] = useState('');
  const [files, setFiles] = useState(null);
  const [group, setGroup] = useState('all');
  const [filter, setFilter] = useState('');
  const [file, setFile] = useState(null);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => { get(B).then((r) => setList(r.snapshots)).catch((e) => setErr(e.message)); }, []);
  const lock = () => { setSnap(null); setFiles(null); setFile(null); setHits(null); setPass(''); };
  async function unlock(s) {
    setErr('');
    try { const r = await post(B + '/' + s.id + '/files', { passphrase: pass }); setSnap(s); setFiles(r.files); } catch (e) { setErr(e.message); }
  }
  const open = (p) => post(B + '/' + snap.id + '/file', { passphrase: pass, path: p }).then(setFile).catch((e) => setErr(e.message));
  const search = () => post(B + '/' + snap.id + '/search', { passphrase: pass, q }).then((r) => setHits(r.hits)).catch((e) => setErr(e.message));
  const groups = files ? ['all', ...[...new Set(files.map((f) => grp(f.p)))].sort()] : [];
  const shown = files ? files.filter((f) => (group === 'all' || grp(f.p) === group) && f.p.toLowerCase().includes(filter.toLowerCase())) : [];

  if (!snap) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h1 className="center">Code vault</h1>
        <p className="center muted">An encrypted copy of all project code. Only the developer can open it, with the vault passphrase. Every opening is logged.</p>
        {err ? <p className="err center">{err}</p> : null}
        <section className="card">
          <label>Vault passphrase<input type="password" autoComplete="off" value={pass} onChange={(e) => setPass(e.target.value)} /></label>
          <p className="muted">It is never stored. If it is lost, the vault cannot be opened.</p>
        </section>
        {!list ? <p className="center muted">Loading...</p> : null}
        {list && !list.length ? <p className="center muted">No snapshots yet. Run vault-snapshot on your laptop.</p> : null}
        {list ? list.map((s) => (
          <section className="card" key={s.id}>
            <div className="mrow">
              <span className="grow"><b>{s.label}</b><br /><span className="muted">{s.files} files &middot; {Math.round(s.bytes / 1024)} KB &middot; commit {s.commit || '-'} &middot; {new Date(s.at).toLocaleString('en-KE')} &middot; id {s.sha}</span></span>
              <button type="button" disabled={!pass} onClick={() => unlock(s)}>Unlock</button>
              <button type="button" className="line sm" onClick={() => call('GET', B + '/' + s.id + '/download').then((d) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d)], { type: 'application/json' })); a.download = 'pyfon-vault-' + s.id + '.json'; a.click(); }).catch((e) => setErr(e.message))}>Download encrypted copy</button>
            </div>
          </section>
        )) : null}
      </div>
    );
  }
  return (
    <div>
      <p><button type="button" className="line sm" onClick={lock}>Lock and leave</button> <b>{snap.label}</b> <span className="muted">({files.length} files)</span></p>
      {err ? <p className="err">{err}</p> : null}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ ...box, flex: '0 0 330px', maxWidth: '100%' }}>
          <select style={{ width: '100%' }} value={group} onChange={(e) => setGroup(e.target.value)}>{groups.map((g) => <option key={g} value={g}>{g}</option>)}</select>
          <input style={{ width: '100%', boxSizing: 'border-box', marginTop: 6 }} placeholder="Filter file names" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <div style={{ maxHeight: '58vh', overflow: 'auto', marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}>
            {shown.slice(0, 600).map((f) => (
              <div key={f.p} style={{ padding: '3px 2px', cursor: 'pointer', background: file && file.path === f.p ? '#eef5ff' : 'none' }} onClick={() => open(f.p)}>{f.p}</div>
            ))}
            {shown.length > 600 ? <p className="muted">Showing 600 of {shown.length}. Narrow the filter.</p> : null}
          </div>
          <div className="mrow" style={{ marginTop: 8 }}>
            <input style={{ flex: 1 }} placeholder="Search all code" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && q.trim().length > 1) search(); }} />
            <button type="button" disabled={q.trim().length < 2} onClick={search}>Search</button>
          </div>
        </div>
        <div style={{ ...box, flex: '1 1 420px', minWidth: 300 }}>
          {hits ? (
            <div style={{ maxHeight: '30vh', overflow: 'auto', marginBottom: 10, fontFamily: 'monospace', fontSize: 12 }}>
              <b>{hits.length} matches (max 200)</b> <button type="button" className="line sm" onClick={() => setHits(null)}>Close</button>
              {hits.map((h, i) => <div key={i} style={{ cursor: 'pointer' }} onClick={() => open(h.p)}>{h.p}:{h.line} &nbsp; {h.text}</div>)}
            </div>
          ) : null}
          {file ? (
            <>
              <b>{file.path}</b>
              <pre style={{ maxHeight: '58vh', overflow: 'auto', background: '#0f1624', color: '#dfe6f3', padding: 12, borderRadius: 8, fontSize: 12, lineHeight: 1.5 }}>
                {file.content.split('\n').map((l, i) => (i + 1) + '  ' + l).join('\n')}
              </pre>
            </>
          ) : <p className="muted">Choose a file on the left.</p>}
        </div>
      </div>
    </div>
  );
}
