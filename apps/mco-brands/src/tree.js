import { showcase } from './groups.js';

// Short taglines (beside the mega-menu pictures) and one-line blurbs (landing-page banner).
// Matched by group title in lower case.
const COPY = {
  clothing: { lines: ['Wear your brand', 'The look you like', 'Made for your whole team'], blurb: 'Tees, hoodies, caps and workwear with your name, logo or design.' },
  'clothing & bags': { lines: ['Wear your brand', 'Carry it your way'], blurb: 'Apparel and bags with your name, logo or design.' },
  drinkware: { lines: ['Sip in style', 'Your name on every cup', 'Gifts that get used'], blurb: 'Mugs, bottles and tumblers made to be used every day.' },
  gifts: { lines: ['Gifts for every occasion', 'Make it personal', 'Say it with a name'], blurb: 'Thoughtful, personal gifts for every occasion.' },
  'home & living': { lines: ['Home, but yours', 'Comfort with your design', 'Make it personal'], blurb: 'Cushions, clocks and more that make a space your own.' },
  accessories: { lines: ['Bring your brand to life!', 'Small things, big impact', 'Carry it your way'], blurb: 'Small things that carry your brand everywhere.' },
  'stickers & magnets': { lines: ['Stick it everywhere', 'Small, bold, yours'], blurb: 'Stick it on, stick it up, make it yours.' },
  office: { lines: ['Desk goals, branded', 'Work looks better printed'], blurb: 'Notebooks, pens and desk pieces your team will reach for.' },
  'promo & events': { lines: ['Stand out at every event', 'Give-aways people keep'], blurb: 'Lanyards, umbrellas and badges for events people remember.' },
  'print & signage': { lines: ['Print it big, print it right', 'Be seen from the street'], blurb: 'Banners, posters and signs, printed big and printed right.' },
  explore: { lines: ['Find something new', 'Picked with care'], blurb: 'Find something new, or pick up where you left off.' }
};
const FALLBACK = { lines: ['Bring your brand to life!', 'The look you like'], blurb: 'Made for you, branded the way you want.' };

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

// Children to show on screen. A child with no items of its own (only links)
// is replaced by its own children so people reach the real pages in one click.
export function kids(n) {
  const out = [];
  for (const c of (n && n.children) || []) {
    if (!(c.count > 0) && c.children && c.children.length) out.push(...c.children);
    else out.push(c);
  }
  return out;
}

// The API does not return link-only nodes, so Explore gets its two personal pages here.
// To add another Explore link later, add a row to EXPLORE_LINKS.
const EXPLORE_LINKS = [
  { key: 'recent', title: 'Recently viewed', to: '/recent' },
  { key: 'for-you', title: 'Designs picked for you', to: '/for-you' }
];
export function addExplore(tree) {
  return (tree || []).map((g) => {
    if (g.key !== 'explore') return g;
    const have = g.children || [];
    const extra = EXPLORE_LINKS.filter((e) => !have.some((c) => c.key === e.key))
      .map((e) => ({ ...e, count: 0, image: g.image, children: [] }));
    return { ...g, children: [...have, ...extra] };
  });
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
