import { useState } from 'react';
import { LESSONS } from './learnLessons.js';

const KEY = 'learn_done';
function readDone() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }

export default function DevLearn() {
  const [open, setOpen] = useState(LESSONS[0].id);
  const [done, setDone] = useState(readDone);
  function toggle(id) {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    setDone(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { /* ignore */ }
  }
  const pct = Math.round((done.length / LESSONS.length) * 100);
  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <h1 className="center">Learn the code</h1>
      <p className="center muted">Nine short lessons about how Pyfon works, using your own files. Open each file in Code &gt; Code explorer as you read.</p>
      <section className="card">
        <b>{done.length} of {LESSONS.length} lessons done</b>
        <div style={{ height: '8px', background: '#e3e3e3', borderRadius: '4px', marginTop: '6px' }}>
          <div style={{ height: '8px', width: pct + '%', background: '#0a7a2f', borderRadius: '4px' }} />
        </div>
      </section>
      {LESSONS.map((l) => (
        <section className="card" key={l.id}>
          <div className="mrow">
            <b className="grow" style={{ cursor: 'pointer' }} onClick={() => setOpen(open === l.id ? '' : l.id)}>
              {done.includes(l.id) ? '\u2713 ' : ''}{l.title}
            </b>
            <button type="button" className="line" onClick={() => setOpen(open === l.id ? '' : l.id)}>{open === l.id ? 'Close' : 'Read'}</button>
          </div>
          {open === l.id ? (
            <>
              {l.text.map((t, i) => <p key={i}>{t}</p>)}
              <p className="muted">Files to open:</p>
              {l.files.map((f) => <div key={f} style={{ fontFamily: 'monospace', fontSize: '13px' }}>{f}</div>)}
              <p style={{ marginTop: '10px' }}><b>Try it:</b> {l.tryIt}</p>
              <div className="actbar" style={{ justifyContent: 'center' }}>
                <button type="button" className={done.includes(l.id) ? 'line' : 'btn'} onClick={() => toggle(l.id)}>{done.includes(l.id) ? 'Mark as not done' : 'I understand this'}</button>
              </div>
            </>
          ) : null}
        </section>
      ))}
    </div>
  );
}
