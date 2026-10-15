import fs from 'node:fs';
import path from 'node:path';
import { query } from '../db/pool.js';

// Usage (from backend): node --env-file=.env src/scripts/set-option-image.js "product name or part of it" Colour Red "a.png|b.png"
const [who, name, value, files] = process.argv.slice(2);
if (!who || !name || !value || !files) {
  console.log('Usage: set-option-image.js "product name" OptionName OptionValue "file1.png|file2.png"');
  process.exit(1);
}
const list = files.split('|').map((s) => s.trim()).filter(Boolean);
const dir = path.resolve('public/product-images');
const missing = list.filter((f) => !fs.existsSync(path.join(dir, f)));
if (missing.length) {
  console.log('Missing image files in public/product-images: ' + missing.join(', '));
  process.exit(1);
}
const like = '%' + who.replace(/[\\%_]/g, '\\$&') + '%';
const it = await query('SELECT id, name FROM catalog_items WHERE sku = $1 OR name ILIKE $2 ORDER BY name', [who, like]);
if (!it.rows.length) {
  console.log('No product matches "' + who + '".');
  process.exit(1);
}
if (it.rows.length > 1) {
  console.log('More than one product matches. Use a longer part of the name:');
  it.rows.forEach((r) => console.log(' - ' + r.name));
  process.exit(1);
}
const id = it.rows[0].id;
await query('DELETE FROM item_option_images WHERE item_id = $1 AND option_name = $2 AND option_value = $3', [id, name, value]);
for (let i = 0; i < list.length; i++) {
  await query('INSERT INTO item_option_images (item_id, option_name, option_value, position, file_name) VALUES ($1, $2, $3, $4, $5)', [id, name, value, i + 1, list[i]]);
}
console.log('Saved ' + list.length + ' image(s) for "' + it.rows[0].name + '" / ' + name + ' = ' + value);
process.exit(0);
