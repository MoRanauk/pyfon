import { query, pool } from '../db/pool.js';

// Usage (from backend):
//   node --env-file=.env src\scripts\hide-nophoto.js                 dry run
//   node --env-file=.env src\scripts\hide-nophoto.js --apply         hide products that only have the starter photo
//   ... --except=Flowers,Gift Sets      keep these categories on sale
//   ... --include-services              also hide services
//   node --env-file=.env src\scripts\hide-nophoto.js --restore --apply   put back products that now have a real photo
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const restore = args.includes('--restore');
const withServices = args.includes('--include-services');
const ex = args.find((a) => a.startsWith('--except='));
const except = ex ? ex.slice(9).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) : [];

let rows;
if (restore) {
  rows = (await query(
    `SELECT i.sku, i.name, c.name AS category FROM catalog_items i JOIN categories c ON c.id = i.category_id
      WHERE i.status = 'draft' AND 'needs-photo' = ANY(coalesce(i.tags, '{}'))
        AND EXISTS (SELECT 1 FROM item_images m WHERE m.item_id = i.id AND m.status = 'active')
        AND NOT EXISTS (SELECT 1 FROM item_images m WHERE m.item_id = i.id AND m.status = 'active' AND m.file_name ILIKE '%placeholder%')
      ORDER BY c.name, i.sku`)).rows;
} else {
  rows = (await query(
    `SELECT i.sku, i.name, c.name AS category FROM catalog_items i JOIN categories c ON c.id = i.category_id
      WHERE i.status = 'active' AND i.sku NOT LIKE 'PH-%' ${withServices ? '' : "AND i.type = 'product'"}
        AND lower(c.name) <> ALL($1::text[])
        AND EXISTS (SELECT 1 FROM item_images m WHERE m.item_id = i.id AND m.status = 'active' AND m.file_name ILIKE '%placeholder%')
        AND NOT EXISTS (SELECT 1 FROM item_images m WHERE m.item_id = i.id AND m.status = 'active' AND m.file_name NOT ILIKE '%placeholder%')
      ORDER BY c.name, i.sku`, [except])).rows;
}
const by = {};
rows.forEach((r) => { by[r.category] = (by[r.category] || 0) + 1; });
console.log((restore ? 'Ready to put back on sale: ' : 'Would hide: ') + rows.length);
Object.keys(by).forEach((k) => console.log('  ' + k + ': ' + by[k]));
rows.slice(0, 8).forEach((r) => console.log('  e.g. ' + r.sku + '  ' + r.name));
if (!apply) {
  console.log('DRY RUN. Nothing changed. Add --apply to do it.');
} else if (!rows.length) {
  console.log('Nothing to do.');
} else {
  const skus = rows.map((r) => r.sku);
  const sql = restore
    ? "UPDATE catalog_items SET status = 'active', tags = array_remove(tags, 'needs-photo'), updated_at = now() WHERE sku = ANY($1::text[]) RETURNING sku"
    : "UPDATE catalog_items SET status = 'draft', tags = CASE WHEN 'needs-photo' = ANY(coalesce(tags, '{}')) THEN tags ELSE array_append(coalesce(tags, '{}'), 'needs-photo') END, updated_at = now() WHERE sku = ANY($1::text[]) RETURNING sku";
  const r = await query(sql, [skus]);
  console.log((restore ? 'Back on sale: ' : 'Hidden (draft): ') + r.rows.length);
  try {
    await query("INSERT INTO audit_log (interface, action, entity_type, entity_id, details) VALUES ('dev', $1, 'system', 'nophoto', $2::jsonb)", [restore ? 'catalog.nophoto_restored' : 'catalog.nophoto_hidden', JSON.stringify({ count: r.rows.length })]);
  } catch (e) { console.log('Done, but the audit line could not be written.'); }
}
try { await pool.end(); } catch (e) { /* ignore */ }
