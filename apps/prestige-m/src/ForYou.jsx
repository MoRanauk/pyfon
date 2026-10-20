import { useMemo } from 'react';
import { useCatalog } from './CatalogState.jsx';
import { getRecent } from './recent.js';
import { mix } from './groups.js';
import { Card } from './Shared.jsx';

// Picks products: first from categories the visitor looked at, then a mix of the rest.
export default function ForYou() {
  const { all } = useCatalog();
  const { items, personal } = useMemo(() => {
    const seen = getRecent();
    const by = new Map(all.map((i) => [i.sku, i]));
    const liked = new Set(seen.map((s) => by.get(s)).filter(Boolean).map((i) => i.categorySlug));
    const pool = all.filter((i) => i.type === 'product' && i.image && !seen.includes(i.sku));
    const first = (a) => [...a.filter((i) => i.featured), ...a.filter((i) => !i.featured)];
    const a = pool.filter((i) => liked.has(i.categorySlug));
    const b = pool.filter((i) => !liked.has(i.categorySlug));
    return { items: [...mix(first(a), 12), ...mix(first(b), 12)], personal: a.length > 0 };
  }, [all]);

  return (
    <div className="wrap section">
      <h2>Designs picked for you</h2>
      <p className="muted">{personal ? 'Based on what you looked at.' : 'Our favourites to start with.'}</p>
      <div className="grid">{items.map((it) => <Card key={it.sku} it={it} />)}</div>
    </div>
  );
}
