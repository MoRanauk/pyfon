import { parse } from 'csv-parse/sync';

export const COLUMNS = ['sku', 'type', 'name', 'category', 'subcategory', 'storefronts', 'description', 'price_type', 'price_kes', 'compare_at_price_kes', 'min_order_qty', 'options', 'personalization', 'vendor', 'stock_status', 'stock_qty', 'lead_time_days', 'images', 'tags', 'featured', 'status'];
const PRICE_TYPES = ['fixed', 'from', 'quote'];
const STOCK = ['in_stock', 'made_to_order', 'out_of_stock'];
const PERS = ['text', 'logo', 'photo'];
export const list = (s) => String(s || '').split('|').map((x) => x.trim()).filter(Boolean);
export const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function intField(raw, label, errs, min = 0) {
  if (raw === '') return null;
  if (!/^\d+$/.test(raw)) { errs.push(`${label}: "${raw}" is not a whole number (no commas, no decimals)`); return null; }
  const n = Number(raw);
  if (n < min) { errs.push(`${label}: must be at least ${min}`); return null; }
  return n;
}

function parseOptions(s, errs) {
  const out = [];
  for (const group of s.split(';').map((x) => x.trim()).filter(Boolean)) {
    const i = group.indexOf(':');
    if (i < 1) { errs.push(`options: "${group}" must look like Name:Value1|Value2`); continue; }
    const name = group.slice(0, i).trim();
    const vals = list(group.slice(i + 1));
    if (!vals.length) { errs.push(`options: group "${name}" has no values`); continue; }
    out.push({ name, values: vals });
  }
  return out;
}

export function validateRow(raw, ctx) {
  const errs = [];
  const g = (k) => String(raw[k] ?? '').trim();
  const sku = g('sku');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,39}$/.test(sku)) errs.push('sku: required, letters, numbers and dashes only (example PB-DRK-001)');
  const type = g('type');
  if (!['product', 'service'].includes(type)) errs.push(`type: "${type}" must be product or service`);
  const name = g('name');
  if (!name) errs.push('name: required');
  const category = g('category');
  if (!category || !slugify(category)) errs.push('category: required');
  const sfCodes = [...new Set(list(g('storefronts')))];
  if (!sfCodes.length) errs.push('storefronts: give at least one of ' + [...ctx.storefronts].join(', '));
  for (const c of sfCodes) if (!ctx.storefronts.has(c)) errs.push(`storefronts: unknown storefront code "${c}"`);
  const priceType = g('price_type');
  if (!PRICE_TYPES.includes(priceType)) errs.push(`price_type: "${priceType}" must be fixed, from or quote`);
  const status = g('status');
  if (!['active', 'draft'].includes(status)) errs.push(`status: "${status}" must be active or draft`);
  const price = intField(g('price_kes'), 'price_kes', errs);
  const compare = intField(g('compare_at_price_kes'), 'compare_at_price_kes', errs);
  if (priceType === 'quote' && (price !== null || compare !== null)) errs.push('price_kes: leave both prices blank when price_type is quote');
  if (PRICE_TYPES.includes(priceType) && priceType !== 'quote' && status === 'active' && price === null) errs.push('price_kes: required for active items unless price_type is quote');
  if (compare !== null && price === null && priceType !== 'quote') errs.push('compare_at_price_kes: needs a price_kes as well');
  if (compare !== null && price !== null && compare <= price) errs.push('compare_at_price_kes: must be higher than price_kes');
  const mq = intField(g('min_order_qty'), 'min_order_qty', errs, 1);
  const options = parseOptions(g('options'), errs);
  const pers = list(g('personalization')).map((x) => x.toLowerCase());
  let personalization = [];
  if (pers.includes('none')) { if (pers.length > 1) errs.push('personalization: "none" cannot be combined with other values'); }
  else {
    for (const p of pers) if (!PERS.includes(p)) errs.push(`personalization: "${p}" must be text, logo, photo or none`);
    personalization = [...new Set(pers.filter((p) => PERS.includes(p)))];
  }
  const stockStatus = g('stock_status') || 'in_stock';
  if (!STOCK.includes(stockStatus)) errs.push(`stock_status: "${stockStatus}" must be in_stock, made_to_order or out_of_stock`);
  const stockQty = intField(g('stock_qty'), 'stock_qty', errs);
  const leadTime = intField(g('lead_time_days'), 'lead_time_days', errs);
  const images = list(g('images'));
  for (const f of images) {
    if (ctx.imageFiles.has(f)) continue;
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.(png|jpe?g|webp)$/i.test(f)) errs.push(`images: "${f}" is not a valid file name (png, jpg or webp, no spaces)`);
    else errs.push(`images: file "${f}" not found in the images folder`);
  }
  const tags = [...new Set(list(g('tags')).map((t) => t.toLowerCase()))];
  const featuredRaw = g('featured').toLowerCase();
  if (!['', 'true', 'false'].includes(featuredRaw)) errs.push(`featured: "${featuredRaw}" must be true or false`);
  return { errs, item: { sku, type, name, category, subcategory: g('subcategory') || null, description: g('description'), storefronts: sfCodes, priceType, price, compare, minQty: mq === null ? 1 : mq, options, personalization, vendor: g('vendor') || null, stockStatus, stockQty, leadTime, images, tags, featured: featuredRaw === 'true', status } };
}

export function readCsv(text) {
  let records;
  try { records = parse(text, { columns: true, skip_empty_lines: true, bom: true, trim: true }); }
  catch (e) { return { error: 'Cannot read the CSV: ' + e.message }; }
  if (!records.length) return { error: 'The CSV has no rows.' };
  const missing = COLUMNS.filter((c) => !(c in records[0]));
  if (missing.length) return { error: 'The CSV is missing these columns: ' + missing.join(', ') };
  return { records };
}

export function validateAll(records, ctx) {
  const errors = []; const items = []; const seenSku = new Map(); const slugOwner = new Map();
  records.forEach((raw, i) => {
    const row = i + 2;
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
  return { errors, items };
}
