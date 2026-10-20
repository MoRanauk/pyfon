import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ERRORS, GROUPS } from './errorCatalog.js';

const KEY = 'm3-error-notes';
const loadNotes = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
const fill = (s, cap) => String(s).split('{1}').join(cap || 'it');

function findMatches(text) {
  const out = [];
  for (const e of ERRORS) {
    for (const re of e.match) {
      const m = text.match(re);
      if (m) { out.push({ e, cap: m[1] || '' }); break; }
    }
  }
  return out.sort((a, b) => Number(a.e.weak) - Number(b.e.weak)).slice(0, 3);
}

function Card({ e, cap }) {
  return (
    <section className="card">
      <h3 style={{ marginTop: 0 }}>{fill(e.title, cap)} <span className="badge">{e.group}</span></h3>
      <p><b>What it means.</b> {fill(e.meaning, cap)}</p>
      <p><b>Why it happened.</b> {fill(e.why, cap)}</p>
      <b>How to fix it</b>
      <ol>{e.fix.map((s, i) => <li key={i}>{fill(s, cap)}</li>)}</ol>
      <p className="muted"><b>Next time.</b> {fill(e.prevent, cap)}</p>
    </section>
  );
}

export default function ErrorExplainer() {
  const [params] = useSearchParams();
  const [text, setText] = useState(params.get('q') || '');
  const [found, setFound] = useState(null);
  const [notes, setNotes] = useState(loadNotes);
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState('');

  function run(t) {
    const s = String(t === undefined ? text : t).trim();
    if (!s) { setFound(null); return; }
    const low = s.toLowerCase();
    setFound({ mine: notes.filter((n) => low.includes(n.key)), hits: findMatches(s) });
  }
  useEffect(() => { if (params.get('q')) run(params.get('q')); }, []); // eslint-disable-line

  function saveNote() {
    const line = text.split('\n').map((l) => l.trim()).find((l) => l);
    if (!line || !note.trim()) return;
    const list = [{ key: line.slice(0, 60).toLowerCase(), text: note.trim() }, ...notes].slice(0, 100);
    setNotes(list);
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
    setNote('');
    setFound({ mine: list.filter((n) => text.toLowerCase().includes(n.key)), hits: found ? found.hits : [] });
  }

  const f = filter.trim().toLowerCase();
  const shown = ERRORS.filter((e) => !f || (e.title + ' ' + e.group + ' ' + e.id).toLowerCase().includes(f));
  const none = found && !found.hits.length && !found.mine.length;
  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <h1 className="center">Error explainer</h1>
      <p className="center muted">Paste any error from the screen, the terminal or the browser. Passwords and keys never need to be pasted.</p>
      <section className="card">
        <textarea rows={6} style={{ width: '100%' }} placeholder="Paste the error here" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="actbar">
          <button type="button" className="btn" onClick={() => run()}>Explain</button>
          <button type="button" className="line" onClick={() => { setText(''); setFound(null); }}>Clear</button>
        </div>
      </section>
      {found ? found.mine.map((n, i) => <section className="card" key={i}><b>Your note.</b> {n.text}</section>) : null}
      {found ? found.hits.map((h) => <Card key={h.e.id} e={h.e} cap={h.cap} />) : null}
      {none ? (
        <section className="card">
          <p><b>This error is not in the catalogue yet.</b> Write what fixed it and it will show up here next time.</p>
          <textarea rows={3} style={{ width: '100%' }} placeholder="What it was and how I fixed it" value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="button" className="line" onClick={saveNote}>Save as my note</button>
          <p className="muted">Notes stay in this browser. Send me the error and I will add it to the catalogue.</p>
        </section>
      ) : null}
      <section className="card">
        <h3 style={{ marginTop: 0 }}>Browse all errors ({ERRORS.length})</h3>
        <input placeholder="Search, for example 409 or port" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: '100%' }} />
        {GROUPS.map((g) => {
          const rows = shown.filter((e) => e.group === g);
          return rows.length ? (
            <div key={g}>
              <p style={{ marginBottom: '4px' }}><b>{g}</b></p>
              {rows.map((e) => (
                <div key={e.id}>
                  <button type="button" className="line sm" style={{ margin: '2px 0' }} onClick={() => setOpen(open === e.id ? '' : e.id)}>{fill(e.title, '...')}</button>
                  {open === e.id ? <Card e={e} cap="" /> : null}
                </div>
              ))}
            </div>
          ) : null;
        })}
      </section>
    </div>
  );
}
