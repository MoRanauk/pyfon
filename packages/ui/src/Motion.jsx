import { useEffect, useRef, useState } from 'react';

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Fades and lifts its content into view when scrolled to.
export function Reveal({ children, delay = 0, style }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(() => reduced());
  useEffect(() => {
    if (shown) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return undefined; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setShown(true); io.disconnect(); }
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return (
    <div
      ref={ref}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(24px)',
        transition: 'opacity .6s ease ' + delay + 'ms, transform .6s ease ' + delay + 'ms',
        ...style
      }}
    >
      {children}
    </div>
  );
}

const FADE = 1400;

// Crossfading hero. slides = [{ image, node }]. The photo drifts slowly (zoom)
// while the next slide dissolves in over it. Pauses on hover, swipe on touch.
export function Slider({ slides, interval = 6000, height = 'clamp(360px, 50vw, 540px)' }) {
  const n = slides.length;
  const [cur, setCur] = useState(0);
  const [prev, setPrev] = useState(-1);
  const [paused, setPaused] = useState(false);
  const clr = useRef(null);
  const touchX = useRef(null);
  const still = reduced();
  const safe = n ? cur % n : 0;

  function go(to) {
    const t = ((to % n) + n) % n;
    if (t === safe) return;
    setPrev(safe);
    setCur(t);
    clearTimeout(clr.current);
    clr.current = setTimeout(() => setPrev(-1), FADE + 150);
  }

  useEffect(() => {
    if (paused || n < 2 || still) return undefined;
    const t = setTimeout(() => go(safe + 1), interval);
    return () => clearTimeout(t);
  }, [safe, paused, n, interval, still]);

  useEffect(() => () => clearTimeout(clr.current), []);

  const key = slides.map((s) => s.image).join('|');
  useEffect(() => {
    slides.forEach((s) => { if (s.image) { const i = new Image(); i.src = s.image; } });
  }, [key]);

  const arrow = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 4,
    width: 42, height: 42, borderRadius: 999, border: 0, cursor: 'pointer',
    background: 'rgba(10,25,48,.45)', color: '#fff', fontSize: 26, lineHeight: '38px', padding: 0
  };

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(safe + (dx < 0 ? 1 : -1));
      }}
      style={{ position: 'relative', overflow: 'hidden', height, background: 'var(--pf-navy)' }}
    >
      <style>{'@keyframes pfkb{from{transform:scale(1)}to{transform:scale(1.1)}}'}</style>
      {slides.map((s, k) => {
        const isCur = k === safe;
        const isPrev = k === prev;
        const live = isCur || isPrev;
        return (
          <div
            key={k}
            aria-hidden={!isCur}
            style={{
              position: 'absolute', inset: 0,
              opacity: live ? 1 : 0,
              zIndex: isCur ? 2 : isPrev ? 1 : 0,
              transition: isCur && !still ? 'opacity ' + FADE + 'ms ease' : 'none',
              pointerEvents: isCur ? 'auto' : 'none'
            }}
          >
            {s.image ? (
              <img
                src={s.image}
                alt=""
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                  animation: live && !still ? 'pfkb ' + (interval + FADE * 2) + 'ms linear forwards' : 'none'
                }}
              />
            ) : null}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(10,25,48,.88) 0%, rgba(10,25,48,.55) 50%, rgba(10,25,48,.12) 100%)' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  maxWidth: 1200, width: '100%', margin: '0 auto', padding: '0 56px',
                  opacity: isCur ? 1 : 0,
                  transform: isCur ? 'none' : 'translateY(16px)',
                  transition: isCur && !still ? 'opacity .9s ease .5s, transform .9s ease .5s' : 'opacity .3s ease'
                }}
              >
                {s.node}
              </div>
            </div>
          </div>
        );
      })}
      {n > 1 ? (
        <>
          <button type="button" aria-label="Previous slide" style={{ ...arrow, left: 10 }} onClick={() => go(safe - 1)}>{'\u2039'}</button>
          <button type="button" aria-label="Next slide" style={{ ...arrow, right: 10 }} onClick={() => go(safe + 1)}>{'\u203a'}</button>
          <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8, zIndex: 4 }}>
            {slides.map((_, k) => (
              <button
                key={k}
                type="button"
                aria-label={'Slide ' + (k + 1)}
                onClick={() => go(k)}
                style={{ width: k === safe ? 26 : 10, height: 10, borderRadius: 999, border: 0, padding: 0, cursor: 'pointer', transition: 'width .4s ease, background .4s ease', background: k === safe ? 'var(--pf-gold)' : 'rgba(255,255,255,.55)' }}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
