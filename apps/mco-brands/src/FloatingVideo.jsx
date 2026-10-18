import { useEffect, useRef, useState } from 'react';
import { API_URL, STORE } from './api.js';

// Floating video on the home page. Plays the shop's playlist one video after another.
// Starts muted (browsers only allow muted autoplay) and does not auto-download on data saver or 2G.
const KEY = 'pyfon_video_closed';
const saver = () => {
  const c = typeof navigator !== 'undefined' ? navigator.connection : null;
  return Boolean(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
};

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
    return <button type="button" className="fvmini" aria-label="Show video" onClick={() => setMini(false)}>{'\u25B6'}</button>;
  }

  return (
    <>
      {big ? <div className="fvback" onClick={() => setBig(false)} /> : null}
      <div className={big ? 'fvid big' : 'fvid'} role="complementary" aria-label="Pyfon Brands video">
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
