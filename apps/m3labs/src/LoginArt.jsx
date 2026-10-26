import { useEffect, useState } from 'react';
import { API_URL } from './api.js';

// Right-hand panel of the sign-in page: a slow slideshow from the developer's gallery, plus an optional advert.
const SLIDE_MS = 7000;

export default function LoginArt({ quote, fallbackImg }) {
  const [data, setData] = useState(null);
  const [k, setK] = useState(0);
  useEffect(() => {
    let live = true;
    fetch(API_URL + '/v1/media/login')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (live && j) setData(j); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  const slides = data && Array.isArray(data.slides) ? data.slides.filter((s) => /^https:\/\//.test(String(s.url || ''))) : [];
  const ad = data && data.advert ? data.advert : null;
  useEffect(() => {
    if (slides.length < 2) return undefined;
    const still = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) return undefined;
    const t = setInterval(() => setK((n) => (n + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  const plain = !slides.length && fallbackImg ? { backgroundImage: 'linear-gradient(rgba(11,42,74,.25),rgba(11,42,74,.25)), url("' + fallbackImg + '")' } : {};
  const cur = slides.length ? slides[k % slides.length] : null;
  const safeLink = ad && /^https:\/\//.test(String(ad.link || '')) ? ad.link : '';
  const safeAdImg = ad && /^https:\/\//.test(String(ad.image || '')) ? ad.image : '';
  return (
    <div className="split-art" style={{ position: 'relative', overflow: 'hidden', ...plain }}>
      {slides.map((s, i) => (
        <div key={s.id} aria-hidden="true" style={{
          position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(11,42,74,.15),rgba(11,42,74,.4)), url("' + s.url + '")',
          backgroundSize: 'cover', backgroundPosition: 'center', opacity: i === k % slides.length ? 1 : 0,
          transform: i === k % slides.length ? 'scale(1.08)' : 'scale(1)', transition: 'opacity 1.8s ease-in-out, transform 9s linear',
        }} />
      ))}
      {ad ? (
        <div style={{ position: 'absolute', zIndex: 2, top: '24px', left: '24px', right: '24px', maxWidth: '420px', background: 'rgba(255,255,255,.95)', color: '#0b2a4a', borderRadius: '14px', padding: '14px 16px', boxShadow: '0 10px 30px rgba(0,0,0,.25)' }}>
          <small style={{ textTransform: 'uppercase', letterSpacing: '.08em', color: '#8a6d0b', fontWeight: 700 }}>Notice</small>
          {safeAdImg ? <img src={safeAdImg} alt="" style={{ display: 'block', width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '10px', margin: '8px 0' }} /> : null}
          {ad.title ? <div style={{ fontWeight: 700, fontSize: '17px', margin: '4px 0' }}>{ad.title}</div> : null}
          {ad.body ? <div style={{ lineHeight: 1.4 }}>{ad.body}</div> : null}
          {safeLink ? <a href={safeLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '8px', fontWeight: 600, color: '#0b2a4a' }}>Open &rarr;</a> : null}
        </div>
      ) : null}
      <blockquote style={{ position: 'relative', zIndex: 1 }}>{cur && cur.caption ? cur.caption : quote}</blockquote>
      {slides.length > 1 ? (
        <div style={{ position: 'absolute', zIndex: 1, bottom: '14px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '6px' }}>
          {slides.map((s, i) => <span key={s.id} style={{ width: '7px', height: '7px', borderRadius: '50%', background: i === k % slides.length ? '#c9a227' : 'rgba(255,255,255,.55)' }} />)}
        </div>
      ) : null}
    </div>
  );
}
