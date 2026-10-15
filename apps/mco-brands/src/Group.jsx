import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCatalog } from './CatalogState.jsx';
import { buildGroups, groupItems, showcase } from './groups.js';
import { copyFor } from './tree.js';
import { FloatPair, Words } from './FloatPair.jsx';
import { Card } from './Shared.jsx';

export default function Group() {
  const { key } = useParams();
  const { cats, all, ready } = useCatalog();
  const [sel, setSel] = useState('');
  useEffect(() => { setSel(''); window.scrollTo(0, 0); }, [key]);

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
  const c = copyFor(g.key);
  const items = groupItems(g, all).filter((i) => !sel || i.categorySlug === sel);

  return (
    <div className="wrap section">
      <section className="ghero" style={{ background: c.color }}>
        <div>
          <h1>{g.title}</h1>
          <p>{c.blurb}</p>
          <div className="ghero-words"><Words lines={c.lines} /></div>
        </div>
        <FloatPair items={showcase(g, all, 8)} lines={c.lines} words={false} height={320} />
      </section>
      <div className="chips">
        <button type="button" className={'chip' + (!sel ? ' on' : '')} onClick={() => setSel('')}>All</button>
        {g.cats.map((x) => (
          <button key={x.slug} type="button" className={'chip' + (sel === x.slug ? ' on' : '')} onClick={() => setSel(x.slug)}>{x.name}</button>
        ))}
      </div>
      <div className="grid" style={{ marginTop: 24 }}>{items.map((it) => <Card key={it.sku} it={it} />)}</div>
    </div>
  );
}
