import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { parse } from 'csv-parse/sync';
import { pool, query } from '../db/pool.js';

// Usage (from the backend folder):
//   node src/scripts/import-products.js            -> dry run, changes nothing
//   node src/scripts/import-products.js --apply    -> loads the CSV for real

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { values } = parseArgs({
  options: {
    file: { type: 'string', default: path.resolve(backendRoot, '..', 'data', 'products.csv') },
    images: { type: 'string', default: path.resolve(backendRoot, 'public', 'product-images') },
    apply: { type: 'boolean', default: false },
  },
});

const COLUMNS = ['sku', 'type', 'name', 'category', 'subcategory', 'storefronts', 'description', 'price_type', 'price_kes', 'compare_at_price_kes', 'min_order_qty', 'options', 'personalization', 'vendor', 'stock_status', 'stock_qty', 'lead_time_days', 'images', 'tags', 'featured', 'status'];
const TYPES = ['product', 'service'];
const PRICE_TYPES = ['fixed', 'from', 'quote'];
const STOCK = ['in_stock', 'made_to_order', 'out_of_stock'];
const STATUSES = ['active', 'draft'];
const PERS = ['text', 'logo', 'photo'];

const list = (s) => String(s || '').split('|').map((x) => x.trim()).filter(Boolean);
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function intField(raw, label, errs, min = 0) {
  if (raw === '') return null;
  if (!/^\d+$/.test(raw)) {
    errs.push(`${label}: "${raw}" is not a whole number (no commas, no decimals)`);
    return null;
  }
  const n = Number(raw);
  if (n < min) {
    errs.push(`${label}: must be at least ${min}`);
    return null;
  }
  return n;
}

function parseOptions(s, errs) {
  const out = [];
  for (const group of s.split(';').map((x) => x.trim()).filter(Boolean)) {
    const i = group.indexOf(':');
    if (i < 1) {
      errs.push(`options: "${group}" must look like Name:Value1|Value2`);
      continue;
    }
    const name = group.slice(0, i).trim();
    const vals = list(group.slice(i + 1));
    if (!vals.length) {
      errs.push(`options: group "${name}" has no values`);
      continue;
    }
    out.push({ name, values: vals });
  }
  return out;
}

function validateRow(raw, ctx) {
  const errs = [];
  const g = (k) => String(raw[k] ?? '').trim();

  const sku = g('sku');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,39}$/.test(sku)) errs.push('sku: required, letters, numbers and dashes only (example PB-DRK-001)');
  const type = g('type');
  if (!TYPES.includes(type)) errs.push(`type: "${type}" must be product or service`);
  const name = g('name');
  if (!name) errs.push('name: required');
  const category = g('category');
  if (!category || !slugify(category)) errs.push('category: required');

  const sfCodes = [...new Set(list(g('storefronts')))];
  if (!sfCodes.length) errs.push('storefronts: give at least one of ' + [...ctx.storefronts].join(', '));
  for (const c of sfCodes) {
    if (!ctx.storefronts.has(c)) errs.push(`storefronts: unknown storefront code "${c}"`);
  }

  const priceType = g('price_type');
  if (!PRICE_TYPES.includes(priceType)) errs.push(`price_type: "${priceType}" must be fixed, from or quote`);
  const status = g('status');
  if (!STATUSES.includes(status)) errs.push(`status: "${status}" must be active or draft`);
  const price = intField(g('price_kes'), 'price_kes', errs);
  const compare = intField(g('compare_at_price_kes'), 'compare_at_price_kes', errs);
  if (priceType === 'quote' && (price !== null || compare !== null)) {
    errs.push('price_kes: leave both prices blank when price_type is quote');
  }
  if (PRICE_TYPES.includes(priceType) && priceType !== 'quote' && status === 'active' && price === null) {
    errs.push('price_kes: required for active items unless price_type is quote');
  }
  if (compare !== null && price === null && priceType !== 'quote') {
    errs.push('compare_at_price_kes: needs a price_kes as well');
  }
  if (compare !== null && price !== null && compare <= price) {
    errs.push('compare_at_price_kes: must be higher than price_kes');
  }

  const minQtyRaw = intField(g('min_order_qty'), 'min_order_qty', errs, 1);
  const minQty = minQtyRaw === null ? 1 : minQtyRaw;
  const options = parseOptions(g('options'), errs);

  const pers = list(g('personalization')).map((x) => x.toLowerCase());
  let personalization = [];
  if (pers.includes('none')) {
    if (pers.length > 1) errs.push('personalization: "none" cannot be combined with other values');
  } else {
    for (const p of pers) {
      if (!PERS.includes(p)) errs.push(`personalization: "${p}" must be text, logo, photo or none`);
    }
    personalization = [...new Set(pers.filter((p) => PERS.includes(p)))];
  }

  const vendor = g('vendor') || null;
  const stockStatus = g('stock_status') || 'in_stock';
  if (!STOCK.includes(stockStatus)) errs.push(`stock_status: "${stockStatus}" must be in_stock, made_to_order or out_of_stock`);
  const stockQty = intField(g('stock_qty'), 'stock_qty', errs);
  const leadTime = intField(g('lead_time_days'), 'lead_time_days', errs);

  const images = list(g('images'));
  for (const f of images) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.(png|jpe?g|webp)$/i.test(f)) errs.push(`images: "${f}" is not a valid file name (png, jpg or webp, no spaces)`);
    else if (!ctx.imageFiles.has(f)) errs.push(`images: file "${f}" not found in the images folder`);
  }

  const tags = [...new Set(list(g('tags')).map((t) => t.toLowerCase()))];
  const featuredRaw = g('featured').toLowerCase();
  if (!['', 'true', 'false'].includes(featuredRaw)) errs.push(`featured: "${featuredRaw}" must be true or false`);

  return {
    errs,
    item: {
      sku, type, name, category, subcategory: g('subcategory') || null, description: g('description'),
      storefronts: sfCodes, priceType, price, compare, minQty, options, personalization, vendor,
      stockStatus, stockQty, leadTime, images, tags, featured: featuredRaw === 'true', status,
    },
  };
}

async function logFailedRun(total, errors) {
  await query(
    'INSERT INTO import_runs (source_file, mode, run_by, rows_total, error_count, errors) VALUES ($1, $2, $3, $4, $5, $6::jsonb)',
    [path.basename(values.file), 'apply', 'cli:' + os.userInfo().username, total, errors.length, JSON.stringify(errors.slice(0, 200))],
  );
}

async function main() {
  if (!fs.existsSync(values.file)) {
    console.error('Cannot find the CSV at ' + values.file);
    process.exitCode = 1;
    return;
  }
  if (!fs.existsSync(values.images)) {
    console.error('Cannot find the images folder at ' + values.images);
    process.exitCode = 1;
    return;
  }
  const imageFiles = new Set(fs.readdirSync(values.images));

  let records;
  try {
    records = parse(fs.readFileSync(values.file, 'utf8'), { columns: true, skip_empty_lines: true, bom: true, trim: true });
  } catch (e) {
    console.error('Cannot read the CSV: ' + e.message);
    process.exitCode = 1;
    return;
  }
  if (!records.length) {
    console.error('The CSV has no rows.');
    process.exitCode = 1;
    return;
  }
  const missingCols = COLUMNS.filter((c) => !(c in records[0]));
  if (missingCols.length) {
    console.error('The CSV is missing these columns: ' + missingCols.join(', '));
    process.exitCode = 1;
    return;
  }

  const sf = await query('SELECT code FROM storefronts');
  const ctx = { storefronts: new Set(sf.rows.map((r) => r.code)), imageFiles };

  const errors = [];
  const items = [];
  const seenSku = new Map();
  const slugOwner = new Map();
  records.forEach((raw, i) => {
    const row = i + 2; // row 1 is the header
    const { errs, item } = validateRow(raw, ctx);
    if (item.sku) {
      if (seenSku.has(item.sku)) errs.push(`sku: duplicate, already used on row ${seenSku.get(item.sku)}`);
      else seenSku.set(item.sku, row);
    }
    const slug = slugify(item.category || '');
    if (slug) {
      if (slugOwner.has(slug) && slugOwner.get(slug) !== item.category) errs.push(`category: "${item.category}" clashes with "${slugOwner.get(slug)}"`);
      else slugOwner.set(slug, item.category);
    }
    for (const message of errs) errors.push({ row, sku: item.sku, message });
    items.push(item);
  });

  console.log(`Rows checked: ${records.length}. Errors: ${errors.length}.`);
  if (errors.length) {
    for (const e of errors) console.log(`  Row ${e.row} (${e.sku || 'no sku'}) ${e.message}`);
    console.log('\nNothing was changed. Fix the CSV and run again.');
    if (values.apply) await logFailedRun(records.length, errors);
    process.exitCode = 1;
    return;
  }

  const existing = await query('SELECT sku FROM catalog_items WHERE sku = ANY($1::text[])', [items.map((i) => i.sku)]);
  const willUpdate = existing.rows.length;
  if (!values.apply) {
    console.log(`Dry run OK. Would create ${items.length - willUpdate} and update ${willUpdate}. Nothing was changed.`);
    console.log('To load for real, run it again with --apply');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('pyfon.csv_import', 'on', true)");
    let created = 0;
    let updated = 0;
    for (const it of items) {
      const cat = await client.query(
        'INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [it.category, slugify(it.category)],
      );
      const r = await client.query(
        `INSERT INTO catalog_items (sku, type, name, category_id, subcategory, description, price_type, price_kes, compare_at_price_kes, min_order_qty, options, personalization, vendor_code, stock_status, stock_qty, lead_time_days, tags, featured, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, $16, $17, $18, $19)
         ON CONFLICT (sku) DO UPDATE SET type = EXCLUDED.type, name = EXCLUDED.name, category_id = EXCLUDED.category_id,
           subcategory = EXCLUDED.subcategory, description = EXCLUDED.description, price_type = EXCLUDED.price_type,
           price_kes = EXCLUDED.price_kes, compare_at_price_kes = EXCLUDED.compare_at_price_kes, min_order_qty = EXCLUDED.min_order_qty,
           options = EXCLUDED.options, personalization = EXCLUDED.personalization, vendor_code = EXCLUDED.vendor_code,
           stock_status = EXCLUDED.stock_status, stock_qty = EXCLUDED.stock_qty, lead_time_days = EXCLUDED.lead_time_days,
           tags = EXCLUDED.tags, featured = EXCLUDED.featured, status = EXCLUDED.status, updated_at = now()
         RETURNING id, (xmax = 0) AS inserted`,
        [it.sku, it.type, it.name, cat.rows[0].id, it.subcategory, it.description, it.priceType, it.price, it.compare, it.minQty,
          JSON.stringify(it.options), it.personalization, it.vendor, it.stockStatus, it.stockQty, it.leadTime, it.tags, it.featured, it.status],
      );
      const id = r.rows[0].id;
      if (r.rows[0].inserted) created++;
      else updated++;
      await client.query('DELETE FROM item_storefronts WHERE item_id = $1', [id]);
      await client.query('INSERT INTO item_storefronts (item_id, storefront_code) SELECT $1, unnest($2::text[])', [id, it.storefronts]);
      const cur = await client.query("SELECT file_name FROM item_images WHERE item_id = $1 AND status = 'active' ORDER BY position", [id]);
      const same = cur.rows.some((x) => /^https?:/.test(x.file_name)) || cur.rows.map((x) => x.file_name).join('|') === it.images.join('|');
      if (it.images.length && !same) await client.query("UPDATE item_images SET status = 'archived', archived_at = now(), archived_by = 'csv-import', archive_reason = 'Replaced by CSV import' WHERE item_id = $1 AND status = 'active'", [id]);
      if (it.images.length && !same) {
        await client.query(
          'INSERT INTO item_images (item_id, position, file_name) SELECT $1, t.ord::smallint, t.f FROM unnest($2::text[]) WITH ORDINALITY AS t(f, ord)',
          [id, it.images],
        );
      }
    }
    await client.query(
      'INSERT INTO import_runs (source_file, mode, run_by, rows_total, created_count, updated_count, error_count, errors) VALUES ($1, $2, $3, $4, $5, $6, 0, $7::jsonb)',
      [path.basename(values.file), 'apply', 'cli:' + os.userInfo().username, items.length, created, updated, '[]'],
    );
    await client.query('COMMIT');
    console.log(`Loaded. Created ${created}, updated ${updated}. The run is logged in import_runs.`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Import failed and was rolled back, nothing changed: ' + e.message);
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
