import { useState, useEffect, useRef } from 'react';
import HarunoChat from './HarunoChat.jsx';

const NAVY = '#0b2a4a';
const GOLD = '#c9a227';
const KEY = 'haruno_tour';
const POS = 'haruno_pos';
const words = (t) => String(t || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
const S = {
  tab: (on) => ({ flex: 1, padding: '8px 6px', border: '1px solid ' + NAVY, borderRadius: '16px', background: on ? NAVY : '#fff', color: on ? '#fff' : NAVY, cursor: 'pointer', fontSize: '14px' }),
  btn: { padding: '7px 14px', border: '1px solid ' + NAVY, borderRadius: '16px', background: NAVY, color: '#fff', cursor: 'pointer' },
  ghost: { padding: '7px 14px', border: '1px solid ' + NAVY, borderRadius: '16px', background: '#fff', color: NAVY, cursor: 'pointer' },
};

function Face({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <circle cx="32" cy="34" r="24" fill="#ffd9b0" stroke={NAVY} strokeWidth="2.5" />
      <path d="M9 30c0-14 10-22 23-22s23 8 23 22c-6-8-14-11-23-11S15 22 9 30z" fill={NAVY} />
      <circle cx="23" cy="36" r="4.5" fill="#fff" stroke={NAVY} strokeWidth="1.5" />
      <circle cx="41" cy="36" r="4.5" fill="#fff" stroke={NAVY} strokeWidth="1.5" />
      <circle cx="24" cy="37" r="2.2" fill={NAVY} />
      <circle cx="42" cy="37" r="2.2" fill={NAVY} />
      <ellipse cx="16" cy="44" rx="4" ry="2.5" fill="#ff9fa8" />
      <ellipse cx="48" cy="44" rx="4" ry="2.5" fill="#ff9fa8" />
      <path d="M25 46c3 5 11 5 14 0" fill="none" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="8" r="3" fill={GOLD} />
    </svg>
  );
}

function atMatch(at, p) {
  if (!at) return true;
  return [].concat(at).some((a) => (a === '/' ? p === '/' : p === a || p.startsWith(a + '/')));
}
function byRoute(path, map) {
  const keys = Object.keys(map || {}).filter((k) => k !== '*' && (k === '/' ? path === '/' : path === k || path.startsWith(k + '/')));
  keys.sort((a, b) => b.length - a.length);
  return keys.length ? map[keys[0]] : null;
}
function findEl(c) {
  if (c.txt) {
    const re = new RegExp(c.txt, 'i');
    return Array.from(document.querySelectorAll('button,a')).find((e) => re.test(e.textContent || '') && !e.closest('[data-haruno]')) || null;
  }
  return c.sel ? document.querySelector(c.sel) : null;
}
function readResume() {
  try { const v = sessionStorage.getItem(KEY); return v === null ? null : Number(v); } catch (e) { return null; }
}
function loadPos() {
  try { const v = JSON.parse(localStorage.getItem(POS)); return v && typeof v.r === 'number' && typeof v.b === 'number' ? v : null; } catch (e) { return null; }
}

function Tour({ steps, start, path, go, journey, onClose }) {
  const [i, setI] = useState(start);
  const [r, setR] = useState(null);
  const elRef = useRef(null);
  const dir = useRef(1);
  const st = steps[i];
  const here = atMatch(st.at, path);
  useEffect(() => {
    if (journey) { try { sessionStorage.setItem(KEY, String(i)); } catch (e) { /* ignore */ } }
  }, [i]);
  useEffect(() => {
    if (here) return;
    const j = steps.findIndex((s, k) => k > i && atMatch(s.at, path));
    if (j > -1) setI(j);
  }, [path]);
  useEffect(() => {
    elRef.current = null;
    setR(null);
    if (!here) return undefined;
    let n = 0;
    let dead = false;
    let t;
    let iv;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = elRef.current;
      if (!el || !el.isConnected) return;
      const b = el.getBoundingClientRect();
      setR((p) => (p && p.top === b.top && p.left === b.left && p.width === b.width && p.height === b.height ? p : { top: b.top, left: b.left, width: b.width, height: b.height }));
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(measure); };
    function look() {
      if (dead) return;
      const el = findEl(st);
      if (el) {
        elRef.current = el;
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        queue();
        window.addEventListener('scroll', queue, true);
        window.addEventListener('resize', queue);
        iv = setInterval(measure, 400);
        return;
      }
      n += 1;
      if (n > 15) {
        if (st.opt) setI(dir.current < 0 ? Math.max(0, i - 1) : Math.min(steps.length - 1, i + 1));
        return;
      }
      t = setTimeout(look, 200);
    }
    look();
    return () => {
      dead = true;
      clearTimeout(t);
      clearInterval(iv);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', queue, true);
      window.removeEventListener('resize', queue);
    };
  }, [i, path]);
  function next() {
    dir.current = 1;
    if (st.click) {
      const el = findEl(st.click);
      if (el) el.click();
      else if (st.to) { go(st.to); return; }
    }
    setI(i + 1);
  }
  function back() { dir.current = -1; setI(i - 1); }

  if (!here) {
    return (
      <div data-haruno="1" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: '16px', zIndex: 9973, background: '#fff', color: NAVY, borderRadius: '12px', padding: '10px 14px', boxShadow: '0 6px 24px rgba(0,0,0,.4)', display: 'flex', gap: '8px', alignItems: 'center', maxWidth: 'calc(100vw - 20px)' }}>
        <Face size={28} />
        <span>Guide paused.</span>
        <button type="button" style={S.btn} onClick={() => go([].concat(st.at)[0])}>Back to the guide</button>
        <button type="button" style={S.ghost} onClick={onClose}>Close</button>
      </div>
    );
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const seen = r && r.top + r.height > 0 && r.top < vh && r.left + r.width > 0 && r.left < vw;
  let card = { position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' };
  let arrow = null;
  if (seen) {
    const left = Math.max(10, Math.min(vw - 310, r.left));
    if (r.top + r.height + 210 < vh) {
      card = { position: 'fixed', left: left + 'px', top: (r.top + r.height + 16) + 'px' };
      arrow = <div style={{ position: 'fixed', left: Math.max(14, Math.min(vw - 30, r.left + 24)) + 'px', top: (r.top + r.height + 2) + 'px', fontSize: '22px', color: GOLD, zIndex: 9972, lineHeight: 1 }}>{'\u25B2'}</div>;
    } else if (r.top > 220) {
      card = { position: 'fixed', left: left + 'px', bottom: (vh - r.top + 16) + 'px' };
      arrow = <div style={{ position: 'fixed', left: Math.max(14, Math.min(vw - 30, r.left + 24)) + 'px', top: (r.top - 18) + 'px', fontSize: '22px', color: GOLD, zIndex: 9972, lineHeight: 1 }}>{'\u25BC'}</div>;
    } else {
      card = { position: 'fixed', left: left + 'px', bottom: '16px' };
    }
  }
  return (
    <div data-haruno="1" style={{ position: 'fixed', inset: 0, zIndex: 9970, pointerEvents: 'none' }}>
      {seen ? <div style={{ position: 'fixed', top: (r.top - 6) + 'px', left: (r.left - 6) + 'px', width: (r.width + 12) + 'px', height: (r.height + 12) + 'px', border: '3px solid ' + GOLD, borderRadius: '10px', boxShadow: '0 0 0 9999px rgba(0,0,0,.55)', pointerEvents: 'none' }} /> : <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)' }} />}
      {arrow}
      <div style={{ ...card, width: '300px', maxWidth: 'calc(100vw - 20px)', background: '#fff', color: NAVY, borderRadius: '12px', padding: '14px', zIndex: 9973, boxShadow: '0 6px 24px rgba(0,0,0,.4)', textAlign: 'left', pointerEvents: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Face size={32} /><b>{st.title}</b></div>
        <p style={{ margin: '8px 0 12px', lineHeight: 1.4 }}>{st.text}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#666', flex: 1 }}>Step {i + 1} of {steps.length}</span>
          {i > 0 ? <button type="button" style={S.ghost} onClick={back}>&larr; Back</button> : null}
          {i < steps.length - 1 ? <button type="button" style={S.btn} onClick={next}>Next &rarr;</button> : <button type="button" style={S.btn} onClick={onClose}>Finish</button>}
        </div>
        <button type="button" onClick={onClose} style={{ marginTop: '8px', background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '12px', padding: 0 }}>Close the guide</button>
      </div>
    </div>
  );
}

export default function HelpButton({ path = '/', topics = {}, faq = [], tours = {}, go = () => {}, lift = 0, ai = null }) {
  const direct = byRoute(path, tours);
  const steps = direct || tours['*'] || null;
  const journey = Boolean(steps) && !direct;
  const [resume] = useState(readResume);
  const [touring, setTouring] = useState(resume !== null);
  const [start, setStart] = useState(resume === null ? 0 : resume);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('');
  const [q, setQ] = useState('');
  const [found, setFound] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState(loadPos);
  const posRef = useRef(pos);
  const drag = useRef(null);
  const moved = useRef(false);
  useEffect(() => { setMode(''); setFound(null); }, [path]);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cur = pos || { r: 16, b: 16 + lift };
  const R = Math.max(4, Math.min(cur.r, vw - 60));
  const B = Math.max(4, Math.min(cur.b, vh - 60));
  function down(e) {
    if (e.button !== undefined && e.button !== 0) return;
    moved.current = false;
    drag.current = { x: e.clientX, y: e.clientY, r: R, b: B };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }
  function move(e) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!moved.current && Math.abs(dx) + Math.abs(dy) < 6) return;
    moved.current = true;
    const np = { r: Math.max(4, Math.min(d.r - dx, window.innerWidth - 60)), b: Math.max(4, Math.min(d.b - dy, window.innerHeight - 60)) };
    posRef.current = np;
    setPos(np);
  }
  function up() {
    drag.current = null;
    if (moved.current && posRef.current) { try { localStorage.setItem(POS, JSON.stringify(posRef.current)); } catch (e) { /* ignore */ } }
  }
  function click() {
    if (moved.current) { moved.current = false; return; }
    setOpen(!open);
  }
  function begin() {
    setMode('guide');
    if (!steps) return;
    let s = steps.findIndex((x) => atMatch(x.at, path));
    if (s < 0) { go('/'); s = 0; }
    setStart(s);
    setTouring(true);
  }
  function stop() {
    try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    setTouring(false);
    setOpen(false);
  }
  function ask() {
    const qw = words(q);
    if (!qw.length) return;
    const pool = faq.concat(Object.values(topics).map((x) => ({ q: x.title, a: x.text, k: x.title })));
    const scored = pool.map((e) => {
      const ew = words((e.q || '') + ' ' + (e.k || '') + ' ' + (e.a || ''));
      return { e, s: qw.filter((w) => ew.includes(w)).length };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3);
    if (busy) return;
    const local = scored.map((x) => x.e);
    if (!ai) { setFound(local); return; }
    const rest = pool.filter((e) => !local.includes(e));
    const notes = local.concat(rest).slice(0, 12).map((e) => ({ q: String(e.q || '').slice(0, 300), a: String(e.a || '').slice(0, 800) }));
    setBusy(true);
    setFound(null);
    ai(q.slice(0, 300), notes).then((a) => setFound(a ? [{ q: 'Here is what I found:', a }] : local)).catch(() => setFound(local)).then(() => setBusy(false));
  }
  if (touring && steps) return <Tour key={start} steps={steps.slice(0, 10)} start={start} path={path} go={go} journey={journey} onClose={stop} />;

  const w = Math.min(340, vw - 32);
  const boxRight = Math.max(8, Math.min(R, vw - w - 8));
  const above = B < vh / 2;
  const fab = { position: 'fixed', right: R + 'px', bottom: B + 'px', width: '56px', height: '56px', borderRadius: '50%', border: '2px solid ' + GOLD, background: '#fff', padding: 0, cursor: 'grab', zIndex: 9960, boxShadow: '0 4px 14px rgba(0,0,0,.3)', touchAction: 'none', userSelect: 'none' };
  const box = { position: 'fixed', right: boxRight + 'px', width: w + 'px', overflowY: 'auto', background: '#fff', color: NAVY, border: '1px solid #ddd', borderRadius: '14px', boxShadow: '0 6px 24px rgba(0,0,0,.25)', padding: '14px', zIndex: 9960, textAlign: 'left' };
  if (above) { box.bottom = (B + 64) + 'px'; box.maxHeight = Math.max(160, vh - B - 80) + 'px'; }
  else { box.top = (vh - B + 8) + 'px'; box.maxHeight = Math.max(160, B - 20) + 'px'; }
  return (
    <>
      <button type="button" data-haruno="1" style={fab} aria-label="Haruno, your helper" title="Haruno (drag me anywhere)" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={click}><Face size={48} /></button>
      {open ? (
        <div data-haruno="1" style={box} role="dialog" aria-label="Haruno">
          <div style={{ display: mode === 'ask' ? 'none' : 'flex', gap: '10px', alignItems: 'center' }}>
            <Face size={40} />
            <div style={{ lineHeight: 1.35 }}>My name is Haruno.<br />I am here to help you.</div>
          </div>
          <p style={{ margin: '12px 0 8px', lineHeight: 1.4, display: mode === 'ask' ? 'none' : 'block' }}>Would you like a guide on this page, or do you have a question?</p>
          <div style={{ display: mode === 'ask' ? 'none' : 'flex', gap: '6px' }}>
            <button type="button" style={S.tab(mode === 'guide')} onClick={begin}>A guide</button>
            <button type="button" style={S.tab(mode === 'ask')} onClick={() => setMode('ask')}>A question</button>
          </div>
          {mode === 'guide' && !steps ? <p style={{ margin: '10px 0 0' }}>I do not have a guide for this page yet. Try a question.</p> : null}
          {mode === 'ask' ? <HarunoChat onBack={() => setMode('')} ai={ai} faq={faq} topics={topics} face={<Face size={34} />} /> : null}
        </div>
      ) : null}
    </>
  );
}
