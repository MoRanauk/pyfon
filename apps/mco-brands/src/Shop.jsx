import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, STORE, img } from './api.js';
import { useCatalog } from './CatalogState.jsx';
import { findBySlug, kids } from './tree.js';
import { Card } from './Shared.jsx';
import Collage from './Collage.jsx';

export default function Shop() {
  const [sp, setSp] = useSearchParams();
  const { tree, ready } = useCatalog();
  const rawCat = sp.get('category') || '';
  const nodeParam = sp.get('node') || '';
  const q = sp.get('q') || '';
  const type = sp.get('type') || '';
  const page = Number(sp.get('page') || 1);
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
    api.catalog.items(STORE, { category, node, q, type, page, limit: 24 }).then(setData).catch((e) => setError(e.message));
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
  const pics = data ? data.items.filter((i) => i.image) : [];

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
        {data && collage ? (
          <Collage items={pics} imgOf={(it) => img(it.image)} hrefOf={(it) => '/p/' + it.sku} title="Featured picks" />
        ) : null}
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
