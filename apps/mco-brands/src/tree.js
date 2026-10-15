import { showcase } from './groups.js';

// Words, blurbs and colours for each menu group (keys match groups.js).
const COPY = {
  'clothing-bags': { blurb: 'Hoodies, tees, polos, totes and backpacks with your name, logo or design.', lines: ['Wear your brand', 'The look you like', 'Made for your whole team'], color: '#cfe0d4' },
  drinkware: { blurb: 'Mugs, tumblers and bottles that people keep and use every day.', lines: ['Sip in style', 'Your name on every cup', 'Gifts that get used'], color: '#e9d8a6' },
  'home-gifts': { blurb: 'Gifts and homeware made personal, for birthdays, weddings and holidays.', lines: ['Gifts for your holidays', 'Make it personal', 'Home, but yours'], color: '#f2c9c0' },
  'office-tech': { blurb: 'Notebooks, desk gear, phone cases and gadgets with your brand on them.', lines: ['Bring your brand to life!', 'Desk goals, branded', 'Work looks better printed'], color: '#cdd8ee' },
  'promo-events': { blurb: 'Lanyards, badges, stickers and give-aways for events and teams.', lines: ['Stand out at every event', 'Give-aways people keep', 'Your logo, everywhere'], color: '#f3d3a8' },
  'print-signage': { blurb: 'Banners, signage, paperwork and design for your business.', lines: ['Print it big, print it right', 'Be seen from the street', 'We design it, you shine'], color: '#ddd0ee' }
};
const FALLBACK = { blurb: 'Branded and personalised, made to order.', lines: ['Bring your brand to life!', 'The look you like'], color: '#e9d8a6' };

export function copyFor(key) { return COPY[key] || FALLBACK; }

// A generic menu tree: [{ key, title, to, image, children: [...] }]. Any depth works.
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
