import { useEffect, useRef, useState } from 'react';
import { API_URL, STORE } from './api.js';

// Floating video on the home page. Plays the shop's playlist one video after another.
// Starts muted (browsers only allow muted autoplay) and does not auto-download on data saver or 2G.
// Drag it anywhere (not on its buttons); the spot is remembered.
const KEY = 'pyfon_video_closed';
const saver = () => {
  const c = typeof navigator !== 'undefined' ? navigator.connection : null;
  return Boolean(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
};

function useDrag(key) {
  const [pos, setPos] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem(key)); return v && typeof v.x === 'number' ? v : null; } catch (e) { return null; }
  });
  const st = useRef({ on: false, moved: false });
  const last = useRef(pos);
  const bind = {
    onPointerDown(e) {
      if (e.button !== undefined && e.button !== 0) return;
      if (e.target.closest && e.target.closest('.fvbar, .fvx')) return;
      const r = e.currentTarget.getBoundingClientRect();
      st.current = { on: true, moved: false, sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top };
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    },
    onPointerMove(e) {
      const d = st.current;
      if (!d.on) return;
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
      d.moved = true;
      const p = { x: Math.max(0, Math.min(d.ox + dx, window.innerWidth - 60)), y: Math.max(0, Math.min(d.oy + dy, window.innerHeight - 60)) };
      last.current = p;
      setPos(p);
    },
    onPointerUp() {
      const d = st.current;
      d.on = false;
      if (d.moved && last.current) { try { localStorage.setItem(key, JSON.stringify(last.current)); } catch (e) { /* ignore */ } }
    },
    onClickCapture(e) {
      if (st.current.moved) { e.preventDefault(); e.stopPropagation(); st.current.moved = false; }
    },
  };
  const style = { touchAction: 'none' };
  if (pos) {
    style.left = Math.max(0, Math.min(pos.x, window.innerWidth - 60)) + 'px';
    style.top = Math.max(0, Math.min(pos.y, window.innerHeight - 60)) + 'px';
    style.right = 'auto';
    style.bottom = 'auto';
    style.transform = 'none';
  }
  return [style, bind];
}

export default function FloatingVideo() {
  const [list, setList] = useState([]);
  const [i, setI] = useState(0);
  const [closed, setClosed] = useState(() => {
    try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  });
  const [mini, setMini] = useState(false);
  const [big, setBig] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const ref = useRef(null);
  const [vStyle, vBind] = useDrag('pyfon_video_pos');
  const [mStyle, mBind] = useDrag('pyfon_mini_pos');

  useEffect(() => {
    let live = true;
    fetch(API_URL + '/v1/videos/' + STORE, { headers: { 'X-Interface': STORE } })
      .then((r) => (r.ok ? r.json() : { videos: [] }))
      .then((d) => { if (live) setList(Array.isArray(d.videos) ? d.videos : []); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const cur = list.length ? list[i % list.length] : null;
  const curId = cur ? cur.id : null;

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted, curId, mini]);

  useEffect(() => {
    const v = ref.current;
    if (!v || saver()) return;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  }, [curId, mini]);

  function close() {
    setClosed(true);
    try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* ignore */ }
  }
  function toggle() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      v.pause();
    }
  }
  function ended() {
    if (list.length > 1) setI((i + 1) % list.length);
  }

  if (closed || !cur) return null;

  if (mini) {
    return <button type="button" className="fvmini" aria-label="Show video (drag to move)" style={mStyle} {...mBind} onClick={() => setMini(false)}>{'\u25B6'}</button>;
  }

  return (
    <>
      {big ? <div className="fvback" onClick={() => setBig(false)} /> : null}
      <div className={big ? 'fvid big' : 'fvid'} role="complementary" aria-label="Pyfon Brands video" style={big ? undefined : vStyle} {...(big ? {} : vBind)}>
        <video
          key={cur.id}
          ref={ref}
          src={cur.url}
          poster={cur.poster || undefined}
          playsInline
          loop={list.length === 1}
          preload={saver() ? 'none' : 'metadata'}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={ended}
        />
        <button type="button" className="fvx" aria-label="Close video" onClick={close}>{'\u2715'}</button>
        <div className="fvtitle">{cur.title}</div>
        <div className="fvbar">
          <button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}>{playing ? '\u275A\u275A' : '\u25B6'}</button>
          <button type="button" aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(!muted)}>{muted ? '\u{1F507}' : '\u{1F50A}'}</button>
          <button type="button" aria-label={big ? 'Make smaller' : 'Maximize'} onClick={() => setBig(!big)}>{big ? '\u25A3' : '\u25A1'}</button>
          <button type="button" aria-label="Minimize" onClick={() => { setPlaying(false); setBig(false); setMini(true); }}>{'\u2013'}</button>
        </div>
      </div>
    </>
  );
}
