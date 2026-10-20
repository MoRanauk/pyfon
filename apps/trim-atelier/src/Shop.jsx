import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { MENU, SWATCH } from './site.js';
import { useCatalog } from './store.jsx';
import { img } from './api.js';
import { isAddon, inMenu, tagsOf, tagVals, pretty, priceText } from './lib.js';

const FILTERS = [['colour', 'Colour'], ['flower', 'Flower'], ['occasion', 'Occasion'], ['for', 'Gifts for'], ['delivery', 'Delivery']];
const PRICES = [['u3', 'Under 3,000', 0, 3000], ['m3', '3,000 to 6,000', 3000, 6000], ['o6', 'Over 6,000', 6000, 1e9]];

export default function Shop() {
  const { key } = useParams();
  const [sp, setSp] = useSearchParams();
  const { items, ready, error } = useCatalog();
  const [open, setOpen] = useState(false);
  const m = (() => { const f = key ? items.find((i) => i.categorySlug === key) : null; return f ? { key, title: f.category, by: 'cat' } : undefined; })();
  const q = (sp.get('q') || '').toLowerCase();
  const base = useMemo(() => items.filter((i) => !isAddon(i) && (!m || inMenu(i, m))
    && (!q || (i.name + ' ' + (i.subcategory || '') + ' ' + tagsOf(i).join(' ')).toLowerCase().includes(q))), [items, m, q]);
  const sub = sp.get('sub');
  const pr = PRICES.find((p) => p[0] === sp.get('price'));
  const list = base.filter((i) => (!sub || String(i.subcategory || '').trim().toLowerCase() === sub.trim().toLowerCase())
    && (!pr || (i.priceKes != null && i.priceKes >= pr[2] && i.priceKes < pr[3]))
    && FILTERS.every(([p]) => !sp.get(p) || tagVals(i, p).includes(sp.get(p))));
  const set = (k, v) => { const n = new URLSearchParams(sp); if (!v || n.get(k) === v) n.delete(k); else n.set(k, v); setSp(n, { replace: true }); };
  const facet = (p) => { const c = new Map(); base.forEach((i) => tagVals(i, p).forEach((v) => c.set(v, (c.get(v) || 0) + 1))); return [...c.keys()]; };
  const subs = [...new Set(base.map((i) => i.subcategory).filter(Boolean))];
  const active = [...sp.keys()].filter((k) => k !== 'q').length;

  return (
    <div className="wrap sec">
      <h1 className="center">{m ? m.title + (sub ? ' \u00b7 ' + sub : '') : q ? 'Search results' : 'All gifts'}</h1>
      <p className="center"><button type="button" className="chip" onClick={() => setOpen(!open)}>{open ? 'Hide filters' : 'Filter' + (active ? ' (' + active + ')' : '')}</button>
        {active ? <button type="button" className="chip" onClick={() => setSp(q ? { q: sp.get('q') } : {})} style={{ marginLeft: 8 }}>Clear</button> : null}</p>
      {open || active ? (
        <div>
          {subs.length > 1 ? <div className="chips"><span>Type</span>{subs.map((s) => <button key={s} type="button" className={'chip' + (sub === s ? ' on' : '')} onClick={() => set('sub', s)}>{s}</button>)}</div> : null}
          {FILTERS.map(([p, label]) => facet(p).length ? (
            <div className="chips" key={p}><span>{label}</span>
              {facet(p).map((v) => p === 'colour'
                ? <button key={v} type="button" title={pretty(v)} aria-label={pretty(v)} className={'sw' + (sp.get(p) === v ? ' on' : '')} style={{ background: SWATCH[v] || '#ddd' }} onClick={() => set(p, v)} />
                : <button key={v} type="button" className={'chip' + (sp.get(p) === v ? ' on' : '')} onClick={() => set(p, v)}>{pretty(v)}</button>)}
            </div>
          ) : null)}
          <div className="chips"><span>Price (KES)</span>{PRICES.map((p) => <button key={p[0]} type="button" className={'chip' + (sp.get('price') === p[0] ? ' on' : '')} onClick={() => set('price', p[0])}>{p[1]}</button>)}</div>
        </div>
      ) : null}
      <p className="muted">{ready ? list.length + ' gifts' : 'Loading...'}</p>
      {error ? <p className="err">{error}</p> : null}
      <div className="grid">
        {list.map((i) => (
          <Link key={i.sku} to={'/p/' + encodeURIComponent(i.sku)} className="card">
            <div className="ph"><img src={img(i.image)} alt={i.name} loading="lazy" /></div>
            <b>{i.name}</b><span>{priceText(i)}</span>
          </Link>
        ))}
      </div>
      {ready && !list.length ? <p className="center muted">Nothing here yet. Try clearing a filter.</p> : null}
    </div>
  );
}

