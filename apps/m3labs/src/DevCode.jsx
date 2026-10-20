import { useEffect, useMemo, useState } from 'react';
import { get, put } from './http.js';

const B = '/v1/dev/system/code/';

export default function DevCode() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [file, setFile] = useState(null);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [noted, setNoted] = useState([]);
  useEffect(() => { get(B + 'tree').then((x) => { setD(x); setNoted(x.noted || []); }).catch((e) => setErr(e.message)); }, []);

  const groups = useMemo(() => {
    if (!d || !d.files) return [];
    const m = new Map();
    for (const f of d.files) {
      if (q && !f.p.toLowerCase().includes(q.toLowerCase())) continue;
      const i = f.p.lastIndexOf('/');
      const dir = i < 0 ? '(root)' : f.p.slice(0, i);
      if (!m.has(dir)) m.set(dir, []);
      m.get(dir).push(f);
    }
    return [...m.entries()];
  }, [d, q]);

  async function open(p) {
    setErr(''); setMsg('');
    try { const x = await get(B + 'file?path=' + encodeURIComponent(p)); setFile(x); setNote(x.note || ''); window.scrollTo(0, 0); }
    catch (e) { setErr(e.message); }
  }
  async function save() {
    setErr(''); setMsg('');
    try {
      await put(B + 'note', { path: file.path, note });
      setNoted((n) => (note.trim() ? [...new Set([...n, file.path])] : n.filter((x) => x !== file.path)));
      setMsg(note.trim() ? 'Note saved.' : 'Note removed.');
    } catch (e) { setErr(e.message); }
  }

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto' }}>
      <h1 className="center">Code explorer</h1>
      <p className="center muted">Browse the project files and keep your own notes on each one. Files with a note show a pencil. Secret files are never shown.</p>
      {err ? <p className="err center">{err}</p> : null}
      {d && d.notHere ? <section className="card"><p className="center muted">The project files are not on this server. Run this page from your laptop.</p></section> : null}
      {file ? (
        <section className="card">
          <div className="mrow"><b className="grow">{file.path}</b><button type="button" className="line" onClick={() => setFile(null)}>Close</button></div>
          <h2>My note</h2>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={4000} placeholder="What does this file do? What did I learn?" style={{ width: '100%', boxSizing: 'border-box' }} />
          <div className="actbar" style={{ justifyContent: 'center' }}><button type="button" className="btn" onClick={save}>Save note</button></div>
          {msg ? <p className="center">{msg}</p> : null}
          <pre style={{ overflowX: 'auto', fontSize: '12px', maxHeight: '60vh', overflowY: 'auto', margin: 0 }}>{file.text}</pre>
        </section>
      ) : null}
      {d && d.files ? (
        <>
          <p className="center"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a file name" /></p>
          {groups.map(([dir, fs]) => (
            <section className="card" key={dir}>
              <details open={!!q}>
                <summary><b>{dir}</b> <span className="muted">&middot; {fs.length} files</span></summary>
                {fs.map((f) => (
                  <div className="mrow" key={f.p}>
                    <span className="grow">{f.p.slice(f.p.lastIndexOf('/') + 1)}{noted.includes(f.p) ? ' \u270e' : ''}<span className="muted"> &middot; {Math.max(1, Math.round(f.size / 1024))} KB</span></span>
                    <button type="button" className="line" onClick={() => open(f.p)}>Open</button>
                  </div>
                ))}
              </details>
            </section>
          ))}
        </>
      ) : !d && !err ? <p className="center muted">Loading...</p> : null}
    </div>
  );
}
