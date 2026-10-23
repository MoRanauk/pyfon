import { Link, useParams } from 'react-router-dom';
import { useCatalog } from './store.jsx';
import { NAVTREE } from './content.js';

// Index of every menu link, so each page knows its path: Home / Category / Subcategory / ...
const IDX = new Map();
const add = (to, chain) => { if (to && !IDX.has(to)) IDX.set(to, chain); };
NAVTREE.forEach((t) => {
  const a = [[t.title, t.to || '']];
  add(t.to, a);
  (t.links || []).forEach((l) => add(l[1], [...a, [l[0], l[1]]]));
  (t.cols || []).flatMap((c) => [c, c.more]).filter(Boolean).forEach((c) => {
    const b = c.to ? [...a, [c.title, c.to]] : a;
    add(c.to, b);
    c.links.forEach((l) => add(l[1], [...b, [l[0], l[1]]]));
  });
});

export function trailFor(path, search, label) {
  const hit = IDX.get(path + search);
  if (hit) return hit;
  const base = IDX.get(path) || [];
  return [...base, [label || 'Gifts', '']];
}

export function Trail({ trail, className }) {
  const all = [['Home', '/'], ...trail];
  return (
    <nav className={className || 'sbp-crumb'}>
      {all.map((c, i) => <span key={i}>{i ? ' / ' : ''}{c[1] && i < all.length - 1 ? <Link to={c[1]}>{c[0]}</Link> : c[0]}</span>)}
    </nav>
  );
}

// Wraps the product page: the path sits above the description, at the right.
export function ProductCrumbs({ children }) {
  const { sku } = useParams();
  const { items } = useCatalog();
  const it = (items || []).find((i) => i.sku === sku);
  let trail = [];
  if (it) {
    const top = IDX.get('/c/' + it.categorySlug);
    trail = top ? [...top] : [[it.category, '/c/' + it.categorySlug]];
    if (it.subcategory) trail.push([it.subcategory, '/c/' + it.categorySlug + '?sub=' + encodeURIComponent(it.subcategory)]);
    trail.push([it.name, '']);
  }
  return <div><Trail trail={trail} className="sbp-pcrumb" />{children}</div>;
}
