import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// Each layout: cls = CSS class, n = tiles used, pos = [left%, top%, width%, rotate, z]
const LAYOUTS = [
  { cls: 'grid wall', n: 8 },
  { cls: 'abs pol scatter', n: 10, ar: '16/10', r: '4/5', pos: [
    [0,2,22,-5],[18,0,22,3],[37,3,22,-3],[56,0,22,4],[76,3,22,-4],
    [3,50,22,4],[21,53,22,-3],[40,50,22,5],[59,54,22,-4],[77,50,22,3]] },
  { cls: 'abs pol ring', n: 10, ar: '1.3/1', r: '1/1.1', mid: true, pos: [
    [3,3,19,-4],[27,3,19,3],[51,3,19,-3],[75,3,19,4],
    [3,36.5,19,-3],[78,36.5,19,3],
    [3,70,19,4],[27,70,19,-3],[51,70,19,3],[75,70,19,-4]] },
  { cls: 'grid dots', n: 8 },
  { cls: 'grid bento', n: 7 },
  { cls: 'grid brick', n: 9 },
  { cls: 'abs bubbles', n: 9, ar: '2/1', r: '1/1', pos: [
    [1,5,26],[28,2,16],[28,40,20],[46,6,22],[50,54,14],
    [70,2,28],[1,62,16],[66,62,15],[84,62,14]] },
  { cls: 'abs pol fan', n: 7, ar: '3/1', r: '3/4', pos: [
    [0,14,20,-12,6],[13.3,6,20,-8,7],[26.6,2,20,-4,8],[40,0,20,0,9],
    [53.3,2,20,4,8],[66.6,6,20,8,7],[80,14,20,12,6]] },
  { cls: 'grid arch', n: 6 },
  { cls: 'abs honey', n: 7, ar: '1.229/1', r: '1/1.1547', pos: [
    [21.75,0,27.5],[50.75,0,27.5],
    [7.25,30.5,27.5],[36.25,30.5,27.5],[65.25,30.5,27.5],
    [21.75,61,27.5],[50.75,61,27.5]] },
];

function shuffle(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export default function Collage({ items = [], imgOf, hrefOf, title }) {
  const [tick, setTick] = useState(0);
  const last = useRef(-1);
  const key = items.map((i) => i.id || i.sku).join(',');

  const pick = useMemo(() => {
    const ok = LAYOUTS.map((l, i) => i).filter((i) => LAYOUTS[i].n <= items.length);
    const pool = ok.length > 1 ? ok.filter((i) => i !== last.current) : ok;
    const li = pool.length ? pool[Math.floor(Math.random() * pool.length)] : 0;
    last.current = li;
    const mix = shuffle(items);
    const n = LAYOUTS[li].n;
    return { li, list: Array.from({ length: n }, (_, k) => mix[k % (mix.length || 1)]) };
  }, [key, tick]); // eslint-disable-line

  if (!items.length) return null;
  const L = LAYOUTS[pick.li];

  return (
    <div className="czwrap">
      <div className={'cz ' + L.cls} style={L.ar ? { aspectRatio: L.ar } : undefined}>
        {L.mid && title ? <div className="czmid">{title}</div> : null}
        {pick.list.map((it, i) => {
          const p = L.pos ? L.pos[i] : null;
          const style = p
            ? { left: p[0] + '%', top: p[1] + '%', width: p[2] + '%', aspectRatio: L.r,
                transform: 'rotate(' + (p[3] || 0) + 'deg)', zIndex: p[4] || 1 }
            : undefined;
          return (
            <Link key={i} to={hrefOf(it)} className="ct" style={style} aria-label={it.name}>
              <img src={imgOf(it)} alt={it.name || ''} loading="lazy" />
            </Link>
          );
        })}
      </div>
      <button type="button" className="czbtn" onClick={() => setTick((t) => t + 1)}>
        Shuffle picks
      </button>
    </div>
  );
}
