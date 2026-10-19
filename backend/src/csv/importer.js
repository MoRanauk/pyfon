import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HttpError } from '../errors.js';
import { COLUMNS, readCsv, validateAll, slugify } from './validate.js';

const IMG_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'product-images');

async function context(db) {
  const sf = await db.query('SELECT code FROM storefronts');
  const im = await db.query('SELECT DISTINCT file_name FROM item_images');
  const files = new Set(im.rows.map((r) => r.file_name));
  if (fs.existsSync(IMG_DIR)) fs.readdirSync(IMG_DIR).forEach((f) => files.add(f));
  return { storefronts: new Set(sf.rows.map((r) => r.code)), imageFiles: files };
}

export async function checkCsv(db, text, overwrite) {
  const r = readCsv(text);
  if (r.error) return { fatal: r.error, errors: [], rows: 0, create: 0, update: 0, skipped: [], items: [] };
  const { errors, items } = validateAll(r.records, await context(db));
  const out = { rows: items.length, errors, create: 0, update: 0, skipped: [], items };
  if (errors.length) return out;
  const ex = await db.query('SELECT sku, manager_edited FROM catalog_items WHERE sku = ANY($1::text[])', [items.map((i) => i.sku)]);
  const m = new Map(ex.rows.map((x) => [x.sku, x.manager_edited]));
  for (const it of items) {
    if (!m.has(it.sku)) out.create++;
    else if (m.get(it.sku) && !overwrite) out.skipped.push(it.sku);
    else out.update++;
  }
  return out;
}

export async function applyCsv(client, text, overwrite, who, fileName) {
  const c = await checkCsv(client, text, overwrite);
  if (c.fatal || c.errors.length) throw new HttpError(400, 'csv_invalid', c.fatal || 'The file has errors. Upload it again.');
  await client.query("SELECT set_config('pyfon.csv_import', 'on', true)");
  const skip = new Set(c.skipped);
  let created = 0;
  let updated = 0;
  for (const it of c.items) {
    if (skip.has(it.sku)) continue;
    const cat = await client.query('INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id', [it.category, slugify(it.category)]);
    const r = await client.query(
      `INSERT INTO catalog_items (sku, type, name, category_id, subcategory, description, price_type, price_kes, compare_at_price_kes, min_order_qty, options, personalization, vendor_code, stock_status, stock_qty, lead_time_days, tags, featured, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, $16, $17, $18, $19)
       ON CONFLICT (sku) DO UPDATE SET type = EXCLUDED.type, name = EXCLUDED.name, category_id = EXCLUDED.category_id,
         subcategory = EXCLUDED.subcategory, description = EXCLUDED.description, price_type = EXCLUDED.price_type,
         price_kes = EXCLUDED.price_kes, compare_at_price_kes = EXCLUDED.compare_at_price_kes, min_order_qty = EXCLUDED.min_order_qty,
         options = EXCLUDED.options, personalization = EXCLUDED.personalization, vendor_code = EXCLUDED.vendor_code,
         stock_status = EXCLUDED.stock_status, stock_qty = EXCLUDED.stock_qty, lead_time_days = EXCLUDED.lead_time_days,
         tags = EXCLUDED.tags, featured = EXCLUDED.featured, status = EXCLUDED.status, manager_edited = false, updated_at = now()
       RETURNING id, (xmax = 0) AS inserted`,
      [it.sku, it.type, it.name, cat.rows[0].id, it.subcategory, it.description, it.priceType, it.price, it.compare, it.minQty,
        JSON.stringify(it.options), it.personalization, it.vendor, it.stockStatus, it.stockQty, it.leadTime, it.tags, it.featured, it.status]);
    const id = r.rows[0].id;
    if (r.rows[0].inserted) created++; else updated++;
    await client.query('DELETE FROM item_storefronts WHERE item_id = $1', [id]);
    await client.query('INSERT INTO item_storefronts (item_id, storefront_code) SELECT $1, unnest($2::text[])', [id, it.storefronts]);
    const cur = await client.query("SELECT file_name FROM item_images WHERE item_id = $1 AND status = 'active' ORDER BY position", [id]);
    const same = cur.rows.some((x) => /^https?:/.test(x.file_name)) || cur.rows.map((x) => x.file_name).join('|') === it.images.join('|');
    if (it.images.length && !same) {
      await client.query("UPDATE item_images SET status = 'archived', archived_at = now(), archived_by = 'csv-import', archive_reason = 'Replaced by CSV import' WHERE item_id = $1 AND status = 'active'", [id]);
      await client.query('INSERT INTO item_images (item_id, position, file_name) SELECT $1, t.ord::smallint, t.f FROM unnest($2::text[]) WITH ORDINALITY AS t(f, ord)', [id, it.images]);
    }
  }
  await client.query('INSERT INTO import_runs (source_file, mode, run_by, rows_total, created_count, updated_count, error_count, errors) VALUES ($1, $2, $3, $4, $5, $6, 0, $7::jsonb)',
    [fileName, 'apply', 'admin:' + who, c.items.length, created, updated, '[]']);
  return { created, updated, skipped: c.skipped };
}

const q = (v) => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

export async function exportCsv(db) {
  const { rows } = await db.query(
    `SELECT i.sku, i.type, i.name, c.name AS category, i.subcategory, i.description, i.price_type, i.price_kes, i.compare_at_price_kes,
       i.min_order_qty, i.options, i.personalization, i.vendor_code, i.stock_status, i.stock_qty, i.lead_time_days, i.tags, i.featured, i.status,
       (SELECT string_agg(s.storefront_code, '|' ORDER BY s.storefront_code) FROM item_storefronts s WHERE s.item_id = i.id) AS storefronts,
       (SELECT string_agg(m.file_name, '|' ORDER BY m.position) FROM item_images m WHERE m.item_id = i.id AND m.status = 'active') AS images
     FROM catalog_items i LEFT JOIN categories c ON c.id = i.category_id ORDER BY i.sku`);
  const lines = [COLUMNS.join(',')];
  for (const r of rows) {
    const opts = Array.isArray(r.options) ? r.options.map((o) => o.name + ':' + o.values.join('|')).join(';') : '';
    const pers = Array.isArray(r.personalization) && r.personalization.length ? r.personalization.join('|') : 'none';
    const v = { sku: r.sku, type: r.type, name: r.name, category: r.category, subcategory: r.subcategory, storefronts: r.storefronts, description: r.description, price_type: r.price_type, price_kes: r.price_kes, compare_at_price_kes: r.compare_at_price_kes, min_order_qty: r.min_order_qty, options: opts, personalization: pers, vendor: r.vendor_code, stock_status: r.stock_status, stock_qty: r.stock_qty, lead_time_days: r.lead_time_days, images: r.images, tags: Array.isArray(r.tags) ? r.tags.join('|') : '', featured: r.featured ? 'true' : 'false', status: r.status };
    lines.push(COLUMNS.map((c) => q(v[c])).join(','));
  }
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}
