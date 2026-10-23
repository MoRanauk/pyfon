import { query, pool } from '../db/pool.js';

const ph = await query("SELECT count(*)::int AS total, count(*) FILTER (WHERE status = 'active')::int AS live FROM catalog_items WHERE sku LIKE 'PH-%'");
console.log('PH- placeholders: ' + ph.rows[0].total + ' in total, ' + ph.rows[0].live + ' on sale');
const pic = await query("SELECT i.sku, i.name, i.status FROM catalog_items i WHERE i.sku NOT LIKE 'PH-%' AND EXISTS (SELECT 1 FROM item_images m WHERE m.item_id = i.id AND m.status = 'active' AND m.file_name ILIKE '%placeholder%') ORDER BY i.status, i.sku");
console.log('Other products still using a placeholder photo: ' + pic.rows.length);
pic.rows.slice(0, 40).forEach((r) => console.log('  ' + r.sku + '  ' + r.status + '  ' + r.name));
const none = await query("SELECT count(*)::int AS n FROM catalog_items i WHERE i.status = 'active' AND i.sku NOT LIKE 'PH-%' AND NOT EXISTS (SELECT 1 FROM item_images m WHERE m.item_id = i.id AND m.status = 'active')");
console.log('On sale with no photo at all: ' + none.rows[0].n);
try { await pool.end(); } catch (e) { /* ignore */ }
