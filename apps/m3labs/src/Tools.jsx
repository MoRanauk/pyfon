import { useEffect, useRef, useState } from 'react';
import { useAuth } from './Auth.jsx';
import { ls, ukey } from './store.js';

const uid = () => Math.random().toString(36).slice(2, 9);
const COLORS = ['#fff3b0', '#d8f0e0', '#dbe7f5', '#fde2e4', '#e8defa'];
const mmss = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

function useStored(key, init) {
  const [v, setV] = useState(() => ls.get(key, init));
  useEffect(() => { ls.set(key, v); }, [key, v]);
  return [v, setV];
}

function Focus({ k }) {
  const [mins, setMins] = useState(() => ls.get('m3-focus-min', 25));
  const [left, setLeft] = useState(() => ls.get('m3-focus-min', 25) * 60);
  const [run, setRun] = useState(false);
  const [done, setDone] = useStored(k('focus-done'), { date: '', n: 0 });
  const end = useRef(0);
  const today = new Date().toDateString();

  useEffect(() => {
    if (!run) return undefined;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((end.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        setRun(false);
        setDone((d) => ({ date: today, n: (d.date === today ? d.n : 0) + 1 }));
        try { if (navigator.vibrate) navigator.vibrate(400); } catch (e) { /* ignore */ }
      }
    }, 500);
    return () => clearInterval(t);
  }, [run, today, setDone]);

  function start() { const s = left > 0 ? left : mins * 60; setLeft(s); end.current = Date.now() + s * 1000; setRun(true); }
  function reset(m) { const n = m || mins; setMins(n); ls.set('m3-focus-min', n); setRun(false); setLeft(n * 60); }

  return (
    <section className="card">
      <h2>Focus timer</h2>
      <div className="timer">{mmss(left)}</div>
      <p className="center muted">{left === 0 ? 'Session finished. Take a short break.' : run ? 'Stay with one task.' : 'Pick a length and start.'} Sessions finished today: {done.date === today ? done.n : 0}</p>
      <div className="chips" style={{ justifyContent: 'center' }}>
        {[15, 25, 45, 60].map((m) => <button type="button" key={m} className={'chip' + (mins === m ? ' on' : '')} onClick={() => reset(m)}>{m} min</button>)}
      </div>
      <div className="chips" style={{ justifyContent: 'center' }}>
        {run ? <button type="button" onClick={() => setRun(false)}>Pause</button> : <button type="button" onClick={start}>{left === 0 ? 'Start again' : 'Start'}</button>}
        <button type="button" className="line" onClick={() => reset()}>Reset</button>
      </div>
    </section>
  );
}

function Todo({ k }) {
  const [items, setItems] = useStored(k('todo'), []);
  const [t, setT] = useState('');
  function add(e) { e.preventDefault(); if (!t.trim()) return; setItems([{ id: uid(), text: t.trim(), done: false }, ...items]); setT(''); }
  return (
    <section className="card">
      <h2>To-do list</h2>
      <form className="mrow" onSubmit={add}>
        <input style={{ flex: 1 }} placeholder="Add a task" value={t} onChange={(e) => setT(e.target.value)} />
        <button type="submit">Add</button>
      </form>
      {!items.length ? <p className="muted">All clear.</p> : null}
      {items.map((i) => (
        <div className={'todo' + (i.done ? ' done' : '')} key={i.id}>
          <input type="checkbox" checked={i.done} onChange={() => setItems(items.map((x) => (x.id === i.id ? { ...x, done: !x.done } : x)))} />
          <span className="grow">{i.text}</span>
          <button type="button" className="line sm" onClick={() => setItems(items.filter((x) => x.id !== i.id))}>Delete</button>
        </div>
      ))}
    </section>
  );
}

function Agenda({ k }) {
  const [ev, setEv] = useStored(k('events'), []);
  const today = new Date().toLocaleDateString('en-CA');
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');
  function add(e) { e.preventDefault(); if (!title.trim()) return; setEv([...ev, { id: uid(), date, time, title: title.trim() }]); setTitle(''); }
  const sorted = [...ev].sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const upcoming = sorted.filter((e) => e.date >= today);
  const past = sorted.filter((e) => e.date < today).slice(-3);
  const row = (e) => (
    <div className="mrow" key={e.id} style={e.date === today ? { background: '#fff9e6' } : undefined}>
      <span><b>{e.date === today ? 'Today' : e.date}</b> {e.time}</span>
      <span className="grow">{e.title}</span>
      <button type="button" className="line sm" onClick={() => setEv(ev.filter((x) => x.id !== e.id))}>Delete</button>
    </div>
  );
  return (
    <section className="card">
      <h2>Scheduler</h2>
      <form onSubmit={add} className="grid2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <input placeholder="What is happening?" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button type="submit">Add to schedule</button>
      </form>
      {!upcoming.length ? <p className="muted">Nothing coming up.</p> : upcoming.map(row)}
      {past.length ? <><h3>Recent</h3>{past.map(row)}</> : null}
    </section>
  );
}

function Notes({ k }) {
  const [notes, setNotes] = useStored(k('notes'), []);
  return (
    <section className="card">
      <h2>Sticky notes</h2>
      <div><button type="button" onClick={() => setNotes([{ id: uid(), text: '', color: COLORS[notes.length % COLORS.length] }, ...notes])}>New note</button></div>
      {!notes.length ? <p className="muted">No notes yet.</p> : null}
      <div className="notes">
        {notes.map((n) => (
          <div className="note" key={n.id} style={{ background: n.color }}>
            <textarea value={n.text} placeholder="Write here..." onChange={(e) => setNotes(notes.map((x) => (x.id === n.id ? { ...x, text: e.target.value } : x)))} />
            <button type="button" className="line sm" onClick={() => setNotes(notes.filter((x) => x.id !== n.id))}>Delete</button>
          </div>
        ))}
      </div>
    </section>
  );
}

const KEYS = ['C', '+/-', '%', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='];
const SHOW = { '*': '\u00d7', '/': '\u00f7', '-': '\u2212' };
function Calc() {
  const [disp, setDisp] = useState('0');
  const [acc, setAcc] = useState(null);
  const [op, setOp] = useState(null);
  const [fresh, setFresh] = useState(true);
  const apply = (a, b, o) => (o === '+' ? a + b : o === '-' ? a - b : o === '*' ? a * b : o === '/' ? (b === 0 ? NaN : a / b) : b);
  const show = (n) => (Number.isFinite(n) ? String(Math.round(n * 1e9) / 1e9) : 'Error');
  function press(key) {
    if (/^[0-9.]$/.test(key)) {
      if (fresh) { setDisp(key === '.' ? '0.' : key); setFresh(false); }
      else if (key === '.' && disp.includes('.')) return;
      else setDisp(disp === '0' && key !== '.' ? key : disp + key);
    } else if (key === 'C') { setDisp('0'); setAcc(null); setOp(null); setFresh(true); }
    else if (key === '+/-') setDisp(show(-parseFloat(disp)));
    else if (key === '%') setDisp(show(parseFloat(disp) / 100));
    else if (key === '=') {
      if (acc === null || !op) return;
      setDisp(show(apply(acc, parseFloat(disp), op))); setAcc(null); setOp(null); setFresh(true);
    } else {
      const cur = parseFloat(disp);
      if (acc !== null && op && !fresh) { const r = apply(acc, cur, op); setAcc(r); setDisp(show(r)); } else setAcc(cur);
      setOp(key); setFresh(true);
    }
  }
  return (
    <section className="card">
      <h2>Calculator</h2>
      <div className="calc-disp">{disp}</div>
      <div className="calc">
        {KEYS.map((key) => (
          <button type="button" key={key} className={'/*-+='.includes(key) && key.length === 1 ? 'op' : ''} style={key === '0' ? { gridColumn: 'span 2' } : undefined} onClick={() => press(key)}>{SHOW[key] || key}</button>
        ))}
      </div>
    </section>
  );
}

function Links({ k }) {
  const [list, setList] = useStored(k('links'), [
    { id: 'a', title: 'Brevo (email)', url: 'https://app.brevo.com' },
    { id: 'b', title: 'Cloudinary (images and videos)', url: 'https://console.cloudinary.com' },
    { id: 'c', title: 'Render (server)', url: 'https://dashboard.render.com' },
  ]);
  const [go, setGo] = useState('');
  const [title, setTitle] = useState('');
  const norm = (u) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : 'https://' + u.trim());
  const open = (u) => window.open(norm(u), '_blank', 'noopener');
  return (
    <section className="card">
      <h2>Quick links and browser</h2>
      <p className="muted">Most websites refuse to load inside another page, so links open in a new tab.</p>
      <form className="mrow" onSubmit={(e) => { e.preventDefault(); if (go.trim()) open(go); }}>
        <input style={{ flex: 1 }} placeholder="Type a website address" value={go} onChange={(e) => setGo(e.target.value)} />
        <button type="submit">Go</button>
        <button type="button" className="line" disabled={!go.trim() || !title.trim()} onClick={() => { setList([...list, { id: uid(), title: title.trim(), url: norm(go) }]); setTitle(''); }}>Save as</button>
        <input style={{ width: '160px' }} placeholder="Name for it" value={title} onChange={(e) => setTitle(e.target.value)} />
      </form>
      {list.map((l) => (
        <div className="mrow" key={l.id}>
          <a className="grow" href={l.url} target="_blank" rel="noreferrer">{l.title}</a>
          <button type="button" className="line sm" onClick={() => setList(list.filter((x) => x.id !== l.id))}>Delete</button>
        </div>
      ))}
    </section>
  );
}

export default function Tools() {
  const { user } = useAuth();
  const k = (name) => ukey(user, name);
  return (
    <div>
      <h1 className="center">Workspace tools</h1>
      <p className="center muted">Saved on this device for your account only.</p>
      <div className="tools">
        <div><Focus k={k} /><Calc /></div>
        <div><Agenda k={k} /><Todo k={k} /></div>
      </div>
      <Notes k={k} />
      <Links k={k} />
    </div>
  );
}
