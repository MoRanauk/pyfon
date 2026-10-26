import { query } from '../db/pool.js';
const links = [
  ['instagram', 'https://www.instagram.com/pyfonbrands'],
  ['facebook', 'https://www.facebook.com/share/1EVH8zMmMB/'],
  ['whatsapp', 'https://wa.me/254794802462'],
];
for (const store of ['mco', 'prestige', 'trim']) {
  for (const [p, u] of links) {
    await query('INSERT INTO social_links (store, platform, url) VALUES ($1, $2, $3) ON CONFLICT (store, platform) DO NOTHING', [store, p, u]);
  }
}
console.log('Seeded 3 links for each of the 3 shops.');
process.exit(0);
