import { formatKES } from '@pyfon/ui';

// Which categories sit under which menu group. Matched by category NAME.
const GROUPS = [
  { key: 'clothing-bags', title: 'Clothing & Bags', names: ['Apparel', 'Bags'] },
  { key: 'drinkware', title: 'Drinkware', names: ['Drinkware'] },
  { key: 'home-gifts', title: 'Home & Gifts', names: ['Home & Living', 'Wall Art', 'Gift Sets', 'Kids & Babies'] },
  { key: 'office-tech', title: 'Office & Tech', names: ['Stationery', 'Tech & Office', 'Phone Cases'] },
  { key: 'promo-events', title: 'Promo & Events', names: ['Events & Promo', 'Accessories', 'Stickers & Labels'] },
  { key: 'print-signage', title: 'Print & Signage', names: ['Printing', 'Signage & Outdoor', 'Design'] }
];

// Builds the groups from the real categories. Any new category not listed
// above lands in a "More" group, so nothing is ever hidden.
export function buildGroups(cats) {
  const used = new Set();
  const out = GROUPS.map((g) => {
    const list = cats.filter((c) => g.names.some((n) => n.toLowerCase() === c.name.toLowerCase()));
    list.forEach((c) => used.add(c.slug));
    return { key: g.key, title: g.title, cats: list };
  }).filter((g) => g.cats.length);
  const rest = cats.filter((c) => !used.has(c.slug));
  if (rest.length) out.push({ key: 'more', title: 'More', cats: rest });
  return out;
}

export function groupItems(group, all) {
  const slugs = new Set(group.cats.map((c) => c.slug));
  return all.filter((i) => slugs.has(i.categorySlug));
}

// Takes items one category at a time, so a row shows variety.
export function mix(list, n) {
  const groups = new Map();
  list.forEach((it) => {
    if (!groups.has(it.categorySlug)) groups.set(it.categorySlug, []);
    groups.get(it.categorySlug).push(it);
  });
  const lists = [...groups.values()];
  const out = [];
  for (let i = 0; out.length < n && lists.some((g) => i < g.length); i += 1) {
    lists.forEach((g) => { if (out.length < n && i < g.length) out.push(g[i]); });
  }
  return out;
}

// A few good-looking items of a group (featured first, products first).
export function showcase(group, all, n) {
  let list = groupItems(group, all).filter((i) => i.image && i.type === 'product');
  if (!list.length) list = groupItems(group, all).filter((i) => i.image);
  return mix([...list.filter((i) => i.featured), ...list.filter((i) => !i.featured)], n);
}

export function priceText(it) {
  if (it.priceType === 'quote' || it.priceKes == null) return 'Request a quote';
  return (it.priceType === 'from' ? 'From ' : '') + formatKES(it.priceKes);
}
