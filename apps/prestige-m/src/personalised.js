const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const nd = (x) => { const o = typeof x === 'string' ? { t: x, k: [] } : { t: x[0], k: x[1].map(nd) }; o.n = slug(o.t); return o; };
export const PTREE = [
  ['Drinkware', [['Water Bottle', ['Plastic Water Bottle', 'Glass', 'Metallic']], ['Mugs', ['Normal Mugs', 'Magic Mugs', 'Stanley Mugs', 'Thermal Mugs']], ['Flasks', ['Skin Feel Water Bottle', 'Wooden Thermal Flask']], ['Tumblers', ['Leather-Sleeve Tumbler', 'Wooden-Base Tumbler', 'Travel Tumblers', 'Javy Thermal Tumbler']]]],
  ['Personalised Gift Sets', ['Essential Gift Set', 'Classic Gift Set', 'Select Gift Set', 'Executive Gift Set', 'Signature Gift Set', 'Premium Gift Set', 'Prestige Gift Set', 'Pinnacle VIP Gift Set']],
  ['Accessories', [['Keyholders', ['Crystal Keyholder', 'Leather/Metallic Keyholder', 'Wooden/Metallic Keyholder']], ['Bags', ['Canvas Tote Bags', 'Jute Bags']], ['Name Tags', ['Plastic Name Tags', 'Metallic Name Tags']]]],
  ['Apparel', [['T-Shirts', ['Round-Necked T-Shirt', 'Polo-Necked T-Shirt']], 'Hoodies', 'Caps']],
  ['Office', ['Notebooks', 'Diaries', 'Pens']],
  'Do You',
].map(nd);
export const pto = (n) => '/c/personalised?node=' + n;
const by = (t) => PTREE.find((g) => g.t === t);
const col = (g, more) => ({ title: g.t, to: pto(g.n), links: g.k.map((k) => [k.t, pto(k.n)]), more });
const off = by('Office');
export const PCOLS = [
  col(by('Drinkware'), { title: off.t, links: off.k.map((k) => [k.t, pto(k.n)]) }),
  col(by('Personalised Gift Sets')),
  col(by('Accessories')),
  col(by('Apparel'), { title: 'Do You', links: [['Design your own', pto('do-you')]] }),
];
