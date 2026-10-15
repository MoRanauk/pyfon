import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCatalog } from './CatalogState.jsx';
import { buildGroups, groupItems } from './groups.js';
import { Card } from './Shared.jsx';

export default function Group() {
  const { key } = useParams();
  const { cats, all, ready } = useCatalog();
  const [sel, setSel] = useState('');
  useEffect(() => { setSel(''); }, [key]);

  if (!ready) return <div className="wrap section"><p className="muted">Loading...</p></div>;
  const g = buildGroups(cats).find((x) => x.key === key);
  if (!g) {
    return (
      <div className="wrap section">
        <h2>Page not found</h2>
        <Link to="/">Back to home</Link>
      </div>
    );
  }
  const items = groupItems(g, all).filter((i) => !sel || i.categorySlug === sel);

  return (
    <div className="wrap section">
      <p className="muted"><Link to="/">Home</Link> / {g.title}</p>
      <h1 style={{ fontFamily: 'var(--pf-font-heading)', margin: '0 0 16px' }}>{g.title}</h1>
      <div className="chips">
        <button type="button" className={'chip' + (!sel ? ' on' : '')} onClick={() => setSel('')}>All</button>
        {g.cats.map((c) => (
          <button key={c.slug} type="button" className={'chip' + (sel === c.slug ? ' on' : '')} onClick={() => setSel(c.slug)}>{c.name}</button>
        ))}
      </div>
      <div className="grid" style={{ marginTop: 24 }}>{items.map((it) => <Card key={it.sku} it={it} />)}</div>
    </div>
  );
}
