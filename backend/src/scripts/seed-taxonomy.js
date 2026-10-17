import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { pool } from '../db/pool.js';

// WHAT THIS DOES: reads data/taxonomy.json and rebuilds the menu tree in the database.
// Usage (from the backend folder):
//   node --env-file=.env src/scripts/seed-taxonomy.js          -> preview, changes nothing
//   node --env-file=.env src/scripts/seed-taxonomy.js --apply  -> saves the tree
// Safe to repeat. It only rebuilds the menu tree, never products.
//
// HOW A NODE FINDS ITS PRODUCTS (the "match" list in taxonomy.json, entries are OR-ed):
//   {"category":"Drinkware","subcategory":"Mugs"}  -> by CSV category / subcategory
//   {"featured":true}                              -> featured products
//   {"skus":["PB-DRK-009","PB-DRK-011"]}           -> exact product codes (use for gifts)
// A node can also have "link":"/page" (a plain link, no products) and "children":[...].
// TO ADD A PRODUCT TO A GIFT GROUP: add its SKU to that node's "skus" list, then re-run with --apply.

// ---- Setup: where the JSON file is, and the --apply switch ----
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { values } = parseArgs({
  options: {
    file: { type: 'string', default: path.resolve(backendRoot, '..', 'data', 'taxonomy.json') },
    apply: { type: 'boolean', default: false },
  },
});

// ---- Check the JSON before touching the database (bad or duplicate slugs stop here) ----
function check(nodes, seen, trail) {
  if (!Array.isArray(nodes)) throw new Error('Expected a list at ' + trail);
  for (const n of nodes) {
    if (!n.slug || !/^[a-z0-9-]+$/.test(n.slug)) throw new Error('Bad slug at ' + trail + ': ' + n.slug);
    if (!n.title) throw new Error('Missing title for ' + n.slug);
    if (seen.has(n.slug)) throw new Error('Duplicate slug: ' + n.slug);
    seen.add(n.slug);
    if (n.children) check(n.children, seen, trail + '/' + n.slug);
  }
}

// ---- Save one level of the tree, then its children (recursive) ----
async function insert(client, nodes, parentId, depth) {
  let pos = 0;
  for (const n of nodes) {
    // 1) create the node itself
    const r = await client.query(
      'INSERT INTO taxonomy_nodes (parent_id, slug, title, link, position) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [parentId, n.slug, n.title, n.link || null, pos++],
    );
    const id = r.rows[0].id;
    // 2) attach products for each match rule. A rule left out (null) means "any".
    //    To add a new rule type, add one more AND line and one more parameter here.
    let linked = 0;
    for (const m of n.match || []) {
      const l = await client.query(
        `INSERT INTO item_nodes (item_id, node_id)
         SELECT i.id, $1 FROM catalog_items i JOIN categories c ON c.id = i.category_id
         WHERE ($2::text IS NULL OR lower(c.name) = lower($2))
           AND ($3::text IS NULL OR lower(i.subcategory) = lower($3))
           AND ($4::boolean IS NULL OR i.featured = $4)
           AND ($5::text[] IS NULL OR i.sku = ANY($5::text[]))
         ON CONFLICT DO NOTHING`,
        [
          id,
          m.category || null,
          m.subcategory || null,
          m.featured === undefined ? null : m.featured,
          Array.isArray(m.skus) ? m.skus : null,
        ],
      );
      linked += l.rowCount;
    }
    console.log('  '.repeat(depth) + n.slug + (n.match ? ': ' + linked + ' items' : ''));
    // 3) go down into the children
    if (n.children) await insert(client, n.children, id, depth + 1);
  }
}

// ---- Main: wipe old tree, rebuild, report orphans, then save or roll back ----
async function main() {
  const tree = JSON.parse(fs.readFileSync(values.file, 'utf8').replace(/^\uFEFF/, ''));
  check(tree, new Set(), '');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM item_nodes');
    await client.query('DELETE FROM taxonomy_nodes');
    await insert(client, tree, null, 0);
    await client.query('INSERT INTO item_nodes (item_id, node_id) SELECT p.item_id, n.id FROM item_menu_picks p JOIN taxonomy_nodes n ON n.slug = p.node_slug ON CONFLICT DO NOTHING');
    // Orphans: active products that no node shows. Fix them in taxonomy.json.
    const lost = await client.query(
      `SELECT sku, name FROM catalog_items i WHERE i.status = 'active'
       AND NOT EXISTS (SELECT 1 FROM item_nodes n WHERE n.item_id = i.id)`,
    );
    if (lost.rows.length) {
      console.log('\nActive items not in any node (add them to taxonomy.json):');
      for (const r of lost.rows) console.log('  ' + r.sku + '  ' + r.name);
    }
    if (values.apply) {
      await client.query('COMMIT');
      console.log('\nSaved.');
    } else {
      await client.query('ROLLBACK');
      console.log('\nPreview only. Nothing was saved. Add --apply to save.');
    }
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Failed, nothing changed: ' + e.message);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

try {
  await main();
} finally {
  await pool.end();
}
