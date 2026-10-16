import { query } from '../db/pool.js';

// Adds, lists or hides dealers. From backend:
//   node --env-file=.env src/scripts/add-dealer.js --name "Test Dealer One" --speciality "Apparel and uniforms" --blurb "Embroidery and heat press." --featured
//   node --env-file=.env src/scripts/add-dealer.js --list
//   node --env-file=.env src/scripts/add-dealer.js --hide "Test Dealer One"
// Optional: --code DLR-ABC  --phone 0712345678  --image file.png (a file in backend\public\product-images)
const a = process.argv.slice(2);
const val = (f) => { const i = a.indexOf(f); return i >= 0 && a[i + 1] && !a[i + 1].startsWith('--') ? a[i + 1] : ''; };

if (a.includes('--list')) {
  const { rows } = await query('SELECT code, name, speciality, status, featured FROM vendors ORDER BY name');
  if (!rows.length) console.log('No dealers yet.');
  for (const r of rows) console.log(r.code + ' | ' + r.name + ' | ' + r.speciality + ' | ' + r.status + (r.featured ? ' | featured' : ''));
  process.exit(0);
}
if (a.includes('--hide')) {
  const r = await query(`UPDATE vendors SET status = 'hidden' WHERE lower(name) = lower($1) RETURNING code`, [val('--hide')]);
  console.log(r.rows[0] ? 'Hidden: ' + r.rows[0].code : 'No dealer with that name.');
  process.exit(0);
}
const name = val('--name');
const speciality = val('--speciality');
if (!name || !speciality) {
  console.error('Give --name and --speciality, or use --list.');
  process.exit(1);
}
const code = val('--code') || 'DLR-' + name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
await query(
  `INSERT INTO vendors (code, name, speciality, blurb, phone, image, featured, status)
   VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
   ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, speciality = EXCLUDED.speciality, blurb = EXCLUDED.blurb,
     phone = EXCLUDED.phone, image = EXCLUDED.image, featured = EXCLUDED.featured, status = 'active'`,
  [code, name, speciality, val('--blurb') || null, val('--phone') || null, val('--image') || null, a.includes('--featured')]
);
console.log('Saved dealer ' + code + ' (' + name + ')');
process.exit(0);
