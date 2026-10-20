import { pool, query } from '../db/pool.js';
const r = await query("DELETE FROM item_storefronts s USING catalog_items i WHERE s.item_id = i.id AND s.storefront_code = 'trim' AND i.sku NOT LIKE 'TM-%' RETURNING i.sku");
console.log('Removed from TriM: ' + r.rows.length + ' products (they stay on their other shops)');
await pool.end();
