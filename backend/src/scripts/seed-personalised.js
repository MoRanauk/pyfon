import { query } from '../db/pool.js';
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const nd = (x) => (typeof x === 'string' ? { t: x, k: [] } : { t: x[0], k: x[1].map(nd) });
const TREE = [
  ['Drinkware', [['Water Bottle', ['Plastic Water Bottle', 'Glass', 'Metallic']], ['Mugs', ['Normal Mugs', 'Magic Mugs', 'Stanley Mugs', 'Thermal Mugs']], ['Flasks', ['Skin Feel Water Bottle', 'Wooden Thermal Flask']], ['Tumblers', ['Leather-Sleeve Tumbler', 'Wooden-Base Tumbler', 'Travel Tumblers', 'Javy Thermal Tumbler']]]],
  ['Personalised Gift Sets', ['Essential Gift Set', 'Classic Gift Set', 'Select Gift Set', 'Executive Gift Set', 'Signature Gift Set', 'Premium Gift Set', 'Prestige Gift Set', 'Pinnacle VIP Gift Set']],
  ['Accessories', [['Keyholders', ['Crystal Keyholder', 'Leather/Metallic Keyholder', 'Wooden/Metallic Keyholder']], ['Bags', ['Canvas Tote Bags', 'Jute Bags']], ['Name Tags', ['Plastic Name Tags', 'Metallic Name Tags']]]],
  ['Apparel', [['T-Shirts', ['Round-Necked T-Shirt', 'Polo-Necked T-Shirt']], 'Hoodies', 'Caps']],
  ['Office', ['Notebooks', 'Diaries', 'Pens']],
  'Do You',
].map(nd);
const all = process.argv.includes('--all');
const ft = (await query("SELECT data_type FROM information_schema.columns WHERE table_name = 'catalog_items' AND column_name = 'features'")).rows[0];
const FEAT = ft && ft.data_type === 'jsonb' ? "'[]'::jsonb" : "'{}'::text[]";
let cat = (await query("SELECT id FROM categories WHERE slug = 'personalised'")).rows[0];
if (!cat) cat = (await query("INSERT INTO categories (name, slug) VALUES ('Personalised', 'personalised') RETURNING id")).rows[0];
const catId = cat.id;
const ph = (await query("SELECT file_name FROM item_images WHERE status = 'active' ORDER BY id LIMIT 1")).rows[0];
const img = ph ? ph.file_name : null;
let base = (await query("SELECT coalesce(max(substring(sku from 4)::int), 0) AS m FROM catalog_items WHERE sku ~ '^PH-[0-9]+$'")).rows[0].m;
const CNT = "SELECT count(*)::int AS n FROM catalog_items WHERE category_id = $1 AND 'placeholder' = ANY(tags) AND lower(trim(subcategory)) = lower($2) AND ($3::text IS NULL OR $3::text = ANY(tags))";
const INS = [
  'WITH n AS (INSERT INTO catalog_items (sku, type, name, category_id, subcategory, description, features, price_type, min_order_qty, options, personalization, stock_status, tags, featured, status)',
  "SELECT 'PH-' || lpad(($1::int + g)::text, 4, '0'), 'product', $2::text || ' ' || ($3::int + g)::text, $4::bigint, $5::text, 'Photo and details coming soon.', " + FEAT + ", 'quote', 1, '[]'::jsonb, ARRAY['text','logo','photo']::text[], 'made_to_order', $6::text[], false, 'active'",
  'FROM generate_series(1, $7::int) g RETURNING id),',
  's AS (INSERT INTO item_storefronts (item_id, storefront_code) SELECT n.id, u FROM n CROSS JOIN unnest($8::text[]) u RETURNING 1)',
  "INSERT INTO item_images (item_id, position, file_name, status) SELECT id, 1, $9::text, 'active' FROM n WHERE $9::text IS NOT NULL",
].join(' ');
async function fill(cId, root, name, tags, stores, key) {
  const have = (await query(CNT, [cId, root, key])).rows[0].n;
  const need = 10 - have;
  if (need <= 0) return 0;
  await query(INS, [base, name, have, cId, root, tags, need, stores, img]);
  base += need;
  return need;
}
async function node(parentId, name) {
  const f = await query('SELECT id FROM subcategories WHERE category_id = $1 AND coalesce(parent_id, 0) = $2 AND lower(name) = lower($3)', [catId, parentId || 0, name]);
  if (f.rows[0]) return f.rows[0].id;
  return (await query('INSERT INTO subcategories (category_id, name, parent_id) VALUES ($1, $2, $3) RETURNING id', [catId, name, parentId])).rows[0].id;
}
let made = 0;
async function walk(n, parentId, trail, root) {
  const id = await node(parentId, n.t);
  const slugs = [...trail, slug(n.t)];
  if (n.k.length) { for (const c of n.k) await walk(c, id, slugs, root); return; }
  if (n.t === 'Do You') return;
  made += await fill(catId, root, n.t, ['placeholder', ...slugs.map((s) => 'node:' + s)], ['prestige', 'mco'], 'node:' + slug(n.t));
}
for (const r of TREE) await walk(r, null, [], r.t);
console.log('Personalised placeholders added: ' + made);
if (all) {
  const subs = await query("SELECT c.id, s.name FROM subcategories s JOIN categories c ON c.id = s.category_id WHERE s.parent_id IS NULL AND c.slug <> 'personalised' ORDER BY c.id, s.name");
  let more = 0;
  for (const s of subs.rows) {
    const st = await query("SELECT DISTINCT x.storefront_code AS c FROM item_storefronts x JOIN catalog_items i ON i.id = x.item_id WHERE i.category_id = $1 AND NOT ('placeholder' = ANY(i.tags))", [s.id]);
    more += await fill(s.id, s.name, s.name, ['placeholder'], st.rows.length ? st.rows.map((r) => r.c) : ['mco'], null);
  }
  console.log('Other categories placeholders added: ' + more);
}
process.exit(0);
