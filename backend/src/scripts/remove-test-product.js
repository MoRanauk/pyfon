import { pool } from '../db/pool.js';
import { removeFile } from '../uploads/storage.js';

// Removes test products whose name starts with "ZZ TEST " with their photos, designs and Cloudinary files.
// From backend: node --env-file=.env src/scripts/remove-test-product.js
const client = await pool.connect();
const files = [];
try {
  await client.query('BEGIN');
  const items = await client.query("SELECT id, sku, name FROM catalog_items WHERE name LIKE 'ZZ TEST %'");
  for (const it of items.rows) {
    const used = await client.query('SELECT count(*)::int AS n FROM order_lines WHERE item_id = $1', [it.id]);
    if (used.rows[0].n) { console.log('Skipped ' + it.sku + ' (used in an order)'); continue; }
    const im = await client.query('SELECT public_id FROM item_images WHERE item_id = $1 AND public_id IS NOT NULL', [it.id]);
    const ds = await client.query('SELECT public_id FROM item_designs WHERE item_id = $1 AND public_id IS NOT NULL', [it.id]);
    for (const r of [...im.rows, ...ds.rows]) files.push(r.public_id);
    await client.query('DELETE FROM item_storefronts WHERE item_id = $1', [it.id]);
    await client.query('DELETE FROM item_nodes WHERE item_id = $1', [it.id]);
    await client.query('DELETE FROM item_option_images WHERE item_id = $1', [it.id]);
    await client.query('DELETE FROM catalog_items WHERE id = $1', [it.id]);
    console.log('Removed ' + it.sku + ' ' + it.name);
  }
  await client.query("DELETE FROM categories WHERE name = 'Test Category' AND NOT EXISTS (SELECT 1 FROM catalog_items WHERE category_id = categories.id)");
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  console.error('Failed, nothing changed: ' + e.message);
  process.exitCode = 1;
} finally {
  client.release();
}
if (!process.exitCode) for (const f of files) await removeFile(f, 'image/png');
await pool.end();
