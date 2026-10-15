import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, STORE, img } from './api.js';
import { useCatalog } from './CatalogState.jsx';
import { findBySlug, kids } from './tree.js';
import { priceText } from './groups.js';
import { Card } from './Shared.jsx';

// True on narrow windows (collage then shows 2 images per row).
function useNarrow() {
  const q = '(max-width: 700px)';
  const get = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(q).matches;
  const [n, setN] = useState(get);
  useEffect(() => {
    const m = window.matchMedia(q);
    const f = () => setN(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return n;
}

// Collage: every image keeps its own shape (never cropped). Rows are stretched to the full
// width, so image sizes differ, and the page background shows between them.
// To change the rows, edit the two lists of numbers: how many images per row.
function Collage({ items }) {
  const narrow = useNarrow();
  const [ar, setAr] = useState({});
  useEffect(() => {
    let live = true;
    items.forEach((it) => {
      const im = new Image();
      im.onload = () => {
        if (live && im.naturalWidth && im.naturalHeight) setAr((a) => ({ ...a, [it.sku]: im.naturalWidth / im.naturalHeight }));
      };
      im.src = img(it.image);
    });
    return () => { live = false; };
  }, [items]);
  const pattern = narrow ? [2, 2, 2, 2, 2, 2] : [3, 4, 3, 2];
  const rows = [];
  let at = 0;
  for (const n of pattern) {
    if (at >= items.length) break;
    rows.push(items.slice(at, at + n));
    at += n;
  }
  return (
    <div className="jcol">
      {rows.map((row, ri) => (
        <div className="jrow" key={ri}>
          {row.map((it) => {
            const r = Math.min(1.8, Math.max(0.6, ar[it.sku] || 1));
            return (
              <Link key={it.sku} to={'/p/' + it.sku} className="jtile" style={{ flex: r + ' 1 0' }}>
                <img src={img(it.image)} alt="" loading="lazy" style={{ aspectRatio: String(r) }} />
                <span><b>{it.name}</b><small>{priceText(it)}</small></span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function Shop() {
  const [sp, setSp] = useSearchParams();
  const { tree, ready } = useCatalog();
  const rawCat = sp.get('category') || '';
  const nodeParam = sp.get('node') || '';
  const q = sp.get('q') || '';
  const type = sp.get('type') || '';
  const page = Number(sp.get('page') || 1);
  // Old links use ?category=slug. If that slug is also a menu node, treat it as a node.
  const catNode = !nodeParam && rawCat ? findBySlug(tree, rawCat) : null;
  const node = nodeParam || (catNode ? rawCat : '');
  const category = catNode ? '' : rawCat;
  const nodeInfo = node ? findBySlug(tree, node) : null;
  const collage = !!nodeInfo && nodeInfo.key === 'featured-picks' && !q && !type;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) return;
    setData(null);
    setError('');
    api.catalog.items(STORE, { category, node, q, type, page, limit: collage ? 12 : 24 }).then(setData).catch((e) => setError(e.message));
  }, [ready, category, node, q, type, page, collage]);

  function go(p) {
    const next = new URLSearchParams(sp);
    next.set('page', String(p));
    setSp(next);
    window.scrollTo(0, 0);
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const heading = q ? 'Results for "' + q + '"'
    : type === 'service' ? 'Print and design services'
    : nodeInfo ? nodeInfo.title
    : category ? 'Shop: ' + category
    : 'All products and services';
  const chips = nodeInfo ? kids(nodeInfo) : [];

  return (
    <section className="section">
      <div className="wrap">
        <h2>{heading}</h2>
        {chips.length ? (
          <div className="gchips">
            {chips.map((c) => <Link key={c.key} className="chip" to={c.to}>{c.title}</Link>)}
          </div>
        ) : null}
        {error ? <p role="alert">Could not load items: {error}</p> : null}
        {!data && !error ? <p className="muted">Loading...</p> : null}
        {data && !data.items.length ? <p className="muted">Nothing found. Try another search.</p> : null}
        {data && collage ? <Collage items={data.items.slice(0, 12)} /> : null}
        {data && !collage ? <div className="grid">{data.items.map((it) => <Card key={it.sku} it={it} />)}</div> : null}
        {data && !collage && pages > 1 ? (
          <div className="pager">
            <button type="button" disabled={page <= 1} onClick={() => go(page - 1)}>Previous</button>
            <span>Page {page} of {pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => go(page + 1)}>Next</button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
