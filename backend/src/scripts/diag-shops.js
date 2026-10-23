import fs from 'node:fs';
import { query } from '../db/pool.js';
const src = fs.readFileSync('src/routes/partnerBrowse.js', 'utf8');
console.log('Patch in file: ' + (src.includes('keepCat') ? 'YES' : 'NO'));
const a = await query('SELECT s.storefront_code AS shop, c.name, count(*)::int AS n FROM catalog_items i JOIN categories c ON c.id = i.category_id JOIN item_storefronts s ON s.item_id = i.id GROUP BY 1, 2 ORDER BY 1, 2');
let cur = '';
for (const r of a.rows) { if (r.shop !== cur) { cur = r.shop; console.log('\n== ' + cur); } console.log('  ' + r.name + ': ' + r.n); }
const z = await query('SELECT c.name FROM categories c WHERE NOT EXISTS (SELECT 1 FROM catalog_items i WHERE i.category_id = c.id) ORDER BY 1');
console.log('\nEmpty everywhere (shown in every shop): ' + (z.rows.map((r) => r.name).join(', ') || 'none'));
const u = await query('SELECT count(*)::int AS n FROM catalog_items i WHERE NOT EXISTS (SELECT 1 FROM item_storefronts s WHERE s.item_id = i.id)');
console.log('Items listed in NO shop: ' + u.rows[0].n);
process.exit(0);
