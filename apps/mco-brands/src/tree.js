import { showcase } from './groups.js';

// Short taglines shown beside the mega-menu pictures. Matched by group key or title (lower case).
const COPY = {
  clothing: { lines: ['Wear your brand', 'The look you like', 'Made for your whole team'] },
  drinkware: { lines: ['Sip in style', 'Your name on every cup', 'Gifts that get used'] },
  gifts: { lines: ['Gifts for every occasion', 'Make it personal', 'Say it with a name'] },
  'home & living': { lines: ['Home, but yours', 'Comfort with your design', 'Make it personal'] },
  accessories: { lines: ['Bring your brand to life!', 'Small things, big impact', 'Carry it your way'] },
  'stickers & magnets': { lines: ['Stick it everywhere', 'Small, bold, yours'] },
  office: { lines: ['Desk goals, branded', 'Work looks better printed'] },
  'promo & events': { lines: ['Stand out at every event', 'Give-aways people keep'] },
  'print & signage': { lines: ['Print it big, print it right', 'Be seen from the street'] },
  explore: { lines: ['Find something new', 'Picked with care'] }
};
const FALLBACK = { lines: ['Bring your brand to life!', 'The look you like'] };

// Pass a group key or title.
export function copyFor(k) { return COPY[String(k || '').toLowerCase()] || FALLBACK; }

// The node's slug as the backend knows it (read from its ?node= link).
export function slugOf(n) {
  try { return new URL(n.to, 'http://x').searchParams.get('node') || n.key; } catch { return n.key; }
}

export function findByKey(list, key) {
  for (const n of list || []) {
    if (n.key === key) return n;
    const c = findByKey(n.children, key);
    if (c) return c;
  }
  return null;
}

export function findBySlug(list, slug) {
  for (const n of list || []) {
    if (slugOf(n) === slug) return n;
    const c = findBySlug(n.children, slug);
    if (c) return c;
  }
  return null;
}

// Children to show on screen. A child with no items of its own (only links, like "For You")
// is replaced by its own children so people reach the real pages in one click.
export function kids(n) {
  const out = [];
  for (const c of (n && n.children) || []) {
    if (!(c.count > 0) && c.children && c.children.length) out.push(...c.children);
    else out.push(c);
  }
  return out;
}

// Old helper, kept so older files still work.
export function buildTree(groups, all) {
  return groups.map((g) => {
    const pick = showcase(g, all, 1)[0];
    return {
      key: g.key,
      title: g.title,
      to: '/c/' + g.key,
      image: pick ? pick.image : '',
      children: g.cats.map((c) => ({ key: c.slug, title: c.name, to: '/shop?category=' + c.slug }))
    };
  });
}
