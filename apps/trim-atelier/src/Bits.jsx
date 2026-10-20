import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { img, STORE } from './api.js';
import { priceText } from './lib.js';

export const getShip = () => { try { return localStorage.getItem('pyfon_ship_' + STORE) || ''; } catch { return ''; } };
export const setShipPref = (c) => { try { localStorage.setItem('pyfon_ship_' + STORE, c); } catch { /* ignore */ } };

export function videoOf(u) {
  const s = String(u || '').trim();
  if (!s) return null;
  const m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? { yt: m[1] } : { mp4: s };
}

export function Acc({ title, children }) {
  return <details><summary>{title}</summary>{children}</details>;
}

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

// Square lens on the picture and a large zoom window beside it.
export function Zoom({ src, alt }) {
  const ref = useRef(null);
  const [p, setP] = useState(null);
  const L = 130;
  const Z = 460;
  const k = Z / L;
  function move(e) {
    const r = ref.current.getBoundingClientRect();
    setP({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
  }
  const lx = p ? clamp(p.x - L / 2, 0, Math.max(0, p.w - L)) : 0;
  const ly = p ? clamp(p.y - L / 2, 0, Math.max(0, p.h - L)) : 0;
  return (
    <div className="jx-main" ref={ref} onMouseMove={move} onMouseLeave={() => setP(null)}>
      <img src={src} alt={alt} />
      {p ? <div className="jx-lens" style={{ left: lx, top: ly, width: L, height: L }} /> : null}
      {p ? <div className="jx-zoom" style={{ backgroundImage: 'url(' + src + ')', backgroundSize: (p.w * k) + 'px ' + (p.h * k) + 'px', backgroundPosition: (-lx * k) + 'px ' + (-ly * k) + 'px' }} /> : null}
    </div>
  );
}

// Horizontal sliding rail with a thin progress line.
export function Rail({ list }) {
  const r = useRef(null);
  const [b, setB] = useState({ l: 0, w: 100 });
  const upd = () => {
    const e = r.current;
    if (!e || !e.scrollWidth) return;
    setB({ l: (e.scrollLeft / e.scrollWidth) * 100, w: Math.min(100, (e.clientWidth / e.scrollWidth) * 100) });
  };
  useEffect(() => { upd(); }, [list.length]);
  return (
    <div>
      <div className="jx-rail" ref={r} onScroll={upd}>
        {list.map((i) => (
          <Link key={i.sku} to={'/p/' + i.sku}>
            <img src={img(i.image)} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain' }} />
            <div>{i.name}</div>
            <div style={{ opacity: 0.7 }}>{priceText(i)}</div>
          </Link>
        ))}
      </div>
      <div className="jx-track"><i style={{ left: b.l + '%', width: b.w + '%' }} /></div>
    </div>
  );
}
