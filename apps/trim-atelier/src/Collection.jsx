import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { SITE } from './site.js';
import { useCatalog } from './store.jsx';
import { img } from './api.js';
import { isAddon } from './lib.js';
import { groupCats, brandsOf } from './cats.js';
import { Best } from './Best.jsx';

export default function Collection() {
  const { items, ready } = useCatalog();
  const rail = useRef(null);
  const cats = groupCats(items);
  const shop = items.filter((i) => !isAddon(i));
  const best = [...shop.filter((i) => i.featured), ...shop.filter((i) => !i.featured)].slice(0, 10);
  const slide = (n) => { if (rail.current) rail.current.scrollBy({ left: n * 282, behavior: 'smooth' }); };
  return (
    <div className="wrap sec th-col">
      <h1>The collection</h1>
      {cats.length ? (
        <div className="th-tiles">
          {cats.map((c) => { const f = c.items.find((i) => i.image); return (
            <div className="th-tile" key={c.key}>
              <Link className="pic" to={'/c/' + c.key}>{f ? <img src={img(f.image)} alt="" loading="lazy" /> : null}<span>{c.title}</span></Link>
              <div className="th-br">{brandsOf(c).map(([b]) => <Link key={b} to={'/c/' + c.key + '?sub=' + encodeURIComponent(b)}>{b}</Link>)}</div>
            </div>
          ); })}
        </div>
      ) : (
        <div className="th-tiles">{SITE.order.map((n) => <div className="th-tile" key={n}><span className="pic"><span>{n}</span></span></div>)}</div>
      )}
      {!cats.length && ready ? <p className="muted">The collection is being prepared. Please check back soon.</p> : null}
      {best.length ? (
        <>
          <h2 className="t-h2" style={{ marginTop: 80 }}>Best sellers</h2>
          <div className="t-rail" ref={rail}>{best.map((i) => <Best key={i.sku} item={i} />)}</div>
          <div className="t-arrows"><button type="button" aria-label="Previous" onClick={() => slide(-1)}>&larr;</button><button type="button" aria-label="Next" onClick={() => slide(1)}>&rarr;</button></div>
        </>
      ) : null}
      <h2 className="t-h2" style={{ marginTop: 80 }}>Buying guides</h2>
      <div className="t-guides">{SITE.guides.map((g) => <details key={g.t}><summary>{g.t}</summary><p>{g.x}</p></details>)}</div>
    </div>
  );
}
