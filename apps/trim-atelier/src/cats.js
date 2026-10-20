import { isAddon } from './lib.js';
import { SITE } from './site.js';

export function groupCats(items) {
  const m = new Map();
  (items || []).filter((i) => !isAddon(i)).forEach((i) => {
    if (!m.has(i.categorySlug)) m.set(i.categorySlug, { key: i.categorySlug, title: i.category, items: [] });
    m.get(i.categorySlug).items.push(i);
  });
  const rank = (t) => { const k = SITE.order.indexOf(t); return k < 0 ? 99 : k; };
  return [...m.values()].sort((a, b) => rank(a.title) - rank(b.title));
}
export function brandsOf(c) {
  const b = new Map();
  c.items.forEach((i) => { const k = i.subcategory || 'More'; if (!b.has(k)) b.set(k, []); b.get(k).push(i); });
  return [...b.entries()];
}
