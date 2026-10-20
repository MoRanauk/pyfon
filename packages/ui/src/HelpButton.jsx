import { useState, useEffect } from 'react';

const words = (t) => String(t || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
const NAVY = '#0b2a4a';
const GOLD = '#c9a227';
const S = {
  fab: { position: 'fixed', right: '16px', bottom: '16px', width: '56px', height: '56px', borderRadius: '50%', border: '2px solid ' + GOLD, background: '#fff', padding: 0, cursor: 'pointer', zIndex: 60, boxShadow: '0 4px 14px rgba(0,0,0,.3)' },
  box: { position: 'fixed', right: '16px', bottom: '84px', width: 'min(340px, calc(100vw - 32px))', maxHeight: '70vh', overflowY: 'auto', background: '#fff', color: NAVY, border: '1px solid #ddd', borderRadius: '14px', boxShadow: '0 6px 24px rgba(0,0,0,.25)', padding: '14px', zIndex: 60, textAlign: 'left' },
  tab: (on) => ({ flex: 1, padding: '8px 6px', border: '1px solid ' + NAVY, borderRadius: '16px', background: on ? NAVY : '#fff', color: on ? '#fff' : NAVY, cursor: 'pointer', fontSize: '14px' }),
  btn: { padding: '7px 14px', border: '1px solid ' + NAVY, borderRadius: '16px', background: NAVY, color: '#fff', cursor: 'pointer' },
  ghost: { padding: '7px 14px', border: '1px solid ' + NAVY, borderRadius: '16px', background: '#fff', color: NAVY, cursor: 'pointer' },
};

function Face({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
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

function byRoute(path, map) {
  const keys = Object.keys(map || {}).filter((k) => (k === '/' ? path === '/' : path === k || path.startsWith(k + '/')));
  keys.sort((a, b) => b.length - a.length);
  return keys.length ? map[keys[0]] : null;
}

function Tour({ steps, onClose }) {
  const [i, setI] = useState(0);
  const [r, setR] = useState(null);
  const st = steps[i];
  useEffect(() => {
    function find() {
      const el = st.sel ? document.querySelector(st.sel) : null;
      if (!el) { setR(null); return; }
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(() => { const b = el.getBoundingClientRect(); setR({ top: b.top, left: b.left, width: b.width, height: b.height }); }, 250);
    }
    find();
    window.addEventListener('resize', find);
    return () => window.removeEventListener('resize', find);
  }, [i]);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let card = { position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' };
  let arrow = null;
  if (r) {
    const below = r.top + r.height + 190 < vh;
    const left = Math.max(10, Math.min(vw - 310, r.left));
    card = { position: 'fixed', left: left + 'px', top: below ? (r.top + r.height + 16) + 'px' : 'auto', bottom: below ? 'auto' : (vh - r.top + 16) + 'px' };
    arrow = <div style={{ position: 'fixed', left: Math.max(14, Math.min(vw - 30, r.left + 24)) + 'px', top: below ? (r.top + r.height + 2) + 'px' : (r.top - 16) + 'px', fontSize: '22px', color: GOLD, zIndex: 72, lineHeight: 1 }}>{below ? '\u25B2' : '\u25BC'}</div>;
  }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70 }}>
      {r ? <div style={{ position: 'fixed', top: (r.top - 6) + 'px', left: (r.left - 6) + 'px', width: (r.width + 12) + 'px', height: (r.height + 12) + 'px', border: '3px solid ' + GOLD, borderRadius: '10px', boxShadow: '0 0 0 9999px rgba(0,0,0,.55)', pointerEvents: 'none' }} /> : <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)' }} />}
      {arrow}
      <div style={{ ...card, width: '300px', maxWidth: 'calc(100vw - 20px)', background: '#fff', color: NAVY, borderRadius: '12px', padding: '14px', zIndex: 73, boxShadow: '0 6px 24px rgba(0,0,0,.4)', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Face size={32} /><b>{st.title}</b></div>
        <p style={{ margin: '8px 0 12px', lineHeight: 1.4 }}>{st.text}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#666', flex: 1 }}>Step {i + 1} of {steps.length}</span>
          {i > 0 ? <button type="button" style={S.ghost} onClick={() => setI(i - 1)}>&larr; Back</button> : null}
          {i < steps.length - 1 ? <button type="button" style={S.btn} onClick={() => setI(i + 1)}>Next &rarr;</button> : <button type="button" style={S.btn} onClick={onClose}>Finish</button>}
        </div>
        <button type="button" onClick={onClose} style={{ marginTop: '8px', background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '12px', padding: 0 }}>Close the guide</button>
      </div>
    </div>
  );
}

export default function HelpButton({ path = '/', topics = {}, faq = [], tours = {} }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('');
  const [touring, setTouring] = useState(false);
  const [q, setQ] = useState('');
  const [found, setFound] = useState(null);
  const steps = byRoute(path, tours);
  useEffect(() => { setMode(''); setFound(null); setTouring(false); }, [path]);
  function ask() {
    const qw = words(q);
    if (!qw.length) return;
    const pool = faq.concat(Object.values(topics).map((x) => ({ q: x.title, a: x.text, k: x.title })));
    const scored = pool.map((e) => {
      const ew = words((e.q || '') + ' ' + (e.k || '') + ' ' + (e.a || ''));
      return { e, s: qw.filter((w) => ew.includes(w)).length };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3);
    setFound(scored.map((x) => x.e));
  }
  if (touring && steps) return <Tour steps={steps.slice(0, 10)} onClose={() => { setTouring(false); setOpen(false); }} />;
  return (
    <>
      <button type="button" style={S.fab} aria-label="Haruno, your helper" title="Haruno" onClick={() => setOpen(!open)}><Face size={48} /></button>
      {open ? (
        <div style={S.box} role="dialog" aria-label="Haruno">
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Face size={40} />
            <div style={{ lineHeight: 1.35 }}>My name is Haruno.<br />I am here to help you.</div>
          </div>
          <p style={{ margin: '12px 0 8px', lineHeight: 1.4 }}>Would you like a guide on this page, or do you have a question?</p>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" style={S.tab(mode === 'guide')} onClick={() => { setMode('guide'); if (steps) setTouring(true); }}>A guide</button>
            <button type="button" style={S.tab(mode === 'ask')} onClick={() => setMode('ask')}>A question</button>
          </div>
          {mode === 'guide' && !steps ? <p style={{ margin: '10px 0 0' }}>I do not have a guide for this page yet. Try a question.</p> : null}
          {mode === 'ask' ? (
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ask(); }} placeholder="Type your question" style={{ flex: 1, minWidth: 0, padding: '8px', border: '1px solid #bbb', borderRadius: '8px' }} />
                <button type="button" style={S.btn} onClick={ask}>Send</button>
              </div>
              {found ? (found.length ? found.map((e, i) => <p key={i} style={{ margin: '10px 0 0', lineHeight: 1.4 }}><b>{e.q}</b><br />{e.a}</p>)
                : <p style={{ margin: '10px 0 0' }}>I could not find that one. Please send a ticket and the team will help you.</p>) : null}
              <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#666' }}>My answers come from built-in guides. Nothing leaves this site, and I never see your orders or account.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
