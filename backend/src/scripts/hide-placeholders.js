import { query, pool } from '../db/pool.js';

// Hides every PH- placeholder by setting it to draft. Nothing is deleted. Add --apply to really do it.
const apply = process.argv.includes('--apply');
const sel = await query("SELECT sku, name, status FROM catalog_items WHERE sku LIKE 'PH-%' ORDER BY sku");
const live = sel.rows.filter((r) => r.status === 'active');
console.log('Placeholders found: ' + sel.rows.length + '. On sale now: ' + live.length + '.');
live.slice(0, 5).forEach((r) => console.log('  ' + r.sku + '  ' + r.name));
if (!apply) {
  console.log('DRY RUN. Nothing changed. Run again with --apply to hide them.');
} else if (!live.length) {
  console.log('Nothing to hide.');
} else {
  const r = await query("UPDATE catalog_items SET status = 'draft', updated_at = now() WHERE sku LIKE 'PH-%' AND status = 'active' RETURNING sku");
  console.log('Hidden (set to draft): ' + r.rows.length);
  try {
    await query("INSERT INTO audit_log (interface, action, entity_type, entity_id, details) VALUES ('dev', 'catalog.placeholders_hidden', 'system', 'PH', $1::jsonb)", [JSON.stringify({ count: r.rows.length })]);
  } catch (e) { console.log('Hidden, but the audit line could not be written.'); }
}
try { await pool.end(); } catch (e) { /* ignore */ }
