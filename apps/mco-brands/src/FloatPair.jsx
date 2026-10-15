import { useEffect, useState } from 'react';
import { img } from './api.js';

const still = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Cross({ images, every }) {
  const [i, setI] = useState(0);
  const n = images.length;
  useEffect(() => {
    if (n < 2 || still()) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % n), every);
    return () => clearInterval(t);
  }, [n, every]);
  return images.map((src, k) => <img key={src + k} src={src} alt="" className={k === i ? 'on' : ''} />);
}

// Cycles through short lines, each word fading up in turn.
export function Words({ lines, every = 3200 }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (lines.length < 2 || still()) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % lines.length), every);
    return () => clearInterval(t);
  }, [lines.length, every]);
  const line = lines[i % lines.length] || '';
  return (
    <span key={i} className="word">
      {line.split(' ').map((w, k) => <span key={k} style={{ animationDelay: k * 90 + 'ms' }}>{w}{' '}</span>)}
    </span>
  );
}

// Two floating panels, each a slideshow of products, with animated words.
export function FloatPair({ items, lines, height = 240, words = true }) {
  const imgs = items.filter((it) => it.image).map((it) => img(it.image));
  const a = imgs.filter((_, k) => k % 2 === 0);
  const b = imgs.filter((_, k) => k % 2 === 1);
  const A = a.length ? a : b;
  const B = b.length ? b : a;
  if (!A.length) return null;
  return (
    <div className="fp" style={{ height }}>
      <div className="fpa"><Cross images={A} every={3400} /></div>
      <div className="fpb"><Cross images={B} every={4300} /></div>
      {words && lines && lines.length ? <div className="fpword"><Words lines={lines} /></div> : null}
    </div>
  );
}
