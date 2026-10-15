import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, STORE, img } from './api.js';
import { useCatalog } from './CatalogState.jsx';
import { findByKey, kids, slugOf } from './tree.js';
import { Card, Section, Rail } from './Shared.jsx';

const COLORS = ['#e9d8a6', '#cfe0d4', '#f2c9c0', '#cdd8ee', '#f3d3a8', '#ddd0ee'];

export default function Group() {
  const { key } = useParams();
  const { tree, ready } = useCatalog();
  const nav = useNavigate();
  const node = findByKey(tree, key);
  const [items, setItems] = useState(null);

  // Load a few popular items of this group.
  useEffect(() => {
    if (!node) return undefined;
    let live = true;
    setItems(null);
    api.catalog.items(STORE, { node: slugOf(node), limit: 12 })
      .then((d) => { if (live) setItems(d.items); })
      .catch(() => { if (live) setItems([]); });
    return () => { live = false; };
  }, [node]);

  if (!ready) return <div className="wrap section"><p className="muted">Loading...</p></div>;
  if (!node) {
    return (
      <div className="wrap section">
        <h2>Page not found</h2>
        <Link to="/">Back to home</Link>
      </div>
    );
  }

  const list = kids(node);
  return (
    <>
      <div className="wrap section">
        <h2>{node.title}</h2>
        {list.length ? (
          <label className="gdrop">
            Browse {node.title}
            <select value="" onChange={(e) => { if (e.target.value) nav(e.target.value); }}>
              <option value="">Choose...</option>
              {list.map((n) => <option key={n.key} value={n.to}>{n.title}</option>)}
            </select>
          </label>
        ) : null}
        {list.length ? (
          <div className="gtiles">
            {list.map((n, i) => (
              <Link key={n.key} className="ctile" style={{ background: COLORS[i % COLORS.length] }} to={n.to}>
                {n.image ? <img src={img(n.image)} alt="" loading="lazy" /> : null}
                <span className="pill">{n.title}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      {items && items.length ? (
        <Section title={'Popular in ' + node.title} action={<Link to={node.to}>See all</Link>}>
          <Rail>{items.map((it) => <Card key={it.sku} it={it} />)}</Rail>
        </Section>
      ) : null}
    </>
  );
}
