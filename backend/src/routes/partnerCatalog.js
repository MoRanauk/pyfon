import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { withTransaction } from '../db/tx.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { uploadsReady, checkFile, storeFile, removeFile } from '../uploads/storage.js';
import { receive } from './uploads.js';

// Product Manager routes, mounted under /v1/partner/catalog. Any active partner can use them.
// Photos and designs are never deleted here: removing or replacing one moves it to the archive.
// Price changes on live products and unpublishing go through /v1/partner/approvals (all three partners).
export const partnerCatalogRoutes = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: 'too_many_attempts', message: 'Too many changes. Try again later.' } }),
});

const MAX_IMAGES = 12;
const MAX_DESIGNS = 30;

const text = (max) => z.string().trim().max(max);
const kes = z.number().int().min(0).max(10000000);

const itemFields = {
  name: z.string().trim().min(2).max(120),
  type: z.enum(['product', 'service']),
  category: z.string().trim().min(2).max(60),
  subcategory: text(60).nullable(),
  description: text(4000),
  features: z.array(z.string().trim().min(1).max(200)).max(20),
  priceType: z.enum(['fixed', 'from', 'quote']),
  priceKes: kes.nullable(),
  compareAtPriceKes: kes.nullable(),
  minOrderQty: z.number().int().min(1).max(100000),
  options: z.array(z.object({
    name: z.string().trim().min(1).max(40),
    values: z.array(z.string().trim().min(1).max(60)).min(1).max(40),
  })).max(8),
  personalization: z.array(z.enum(['text', 'logo', 'photo'])).max(3),
  stockStatus: z.enum(['in_stock', 'made_to_order', 'out_of_stock']),
  stockQty: z.number().int().min(0).max(10000000).nullable(),
  leadTimeDays: z.number().int().min(0).max(365).nullable(),
  tags: z.array(z.string().trim().min(1).max(30)).max(30),
  featured: z.boolean(),
  storefronts: z.array(z.string().trim().min(1).max(20)).max(5),
  vendor: z.string().trim().max(40).nullable(),
};
const patchSchema = z.object(itemFields).partial();

const COLUMNS = {
  name: 'name', type: 'type', subcategory: 'subcategory', description: 'description', features: 'features',
  priceType: 'price_type', priceKes: 'price_kes', compareAtPriceKes: 'compare_at_price_kes', minOrderQty: 'min_order_qty',
  personalization: 'personalization', stockStatus: 'stock_status', stockQty: 'stock_qty', leadTimeDays: 'lead_time_days',
  tags: 'tags', featured: 'featured',
};

const imgUrl = (f) => (!f ? null : /^https?:/.test(f) ? f : '/images/' + f);
const who = (req) => String(req.user.fullName || req.user.email || req.user.id).slice(0, 80);
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function skuParam(req) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,39}$/.test(req.params.sku)) throw new HttpError(404, 'item_not_found', 'Product not found');
  return req.params.sku;
}
function idParam(req) {
  if (!/^\d{1,18}$/.test(req.params.id)) throw new HttpError(404, 'not_found', 'Not found');
  return req.params.id;
}

function checkPrices(f) {
  if (f.priceType === 'quote') {
    if (f.priceKes != null || f.compareAtPriceKes != null) throw new HttpError(400, 'bad_price', 'Leave the prices empty when the product is priced by quote');
    return;
  }
  if (f.compareAtPriceKes != null && f.priceKes == null) throw new HttpError(400, 'bad_price', 'Enter a price as well as the old price');
  if (f.compareAtPriceKes != null && f.priceKes != null && f.compareAtPriceKes <= f.priceKes) {
    throw new HttpError(400, 'bad_price', 'The old price must be higher than the price');
  }
}

async function checkStorefronts(list) {
  if (!list.length) return;
  const { rows } = await query('SELECT code FROM storefronts WHERE code = ANY($1::text[])', [list]);
  if (rows.length !== new Set(list).size) throw new HttpError(400, 'unknown_storefront', 'Unknown shop code. Use mco, prestige or trim');
}

async function vendorOf(code) {
  if (!code) return null;
  const { rows } = await query("SELECT code FROM vendors WHERE upper(code) = upper($1) AND status = 'active'", [code]);
  if (!rows[0]) throw new HttpError(400, 'unknown_dealer', 'Unknown dealer code');
  return rows[0].code;
}

async function categoryId(client, name) {
  const slug = slugify(name);
  if (!slug) throw new HttpError(400, 'bad_category', 'Enter a category name');
  const clash = await client.query('SELECT name FROM categories WHERE slug = $1 AND name <> $2', [slug, name]);
  if (clash.rows[0]) throw new HttpError(400, 'category_clash', 'The category "' + name + '" is too close to the existing "' + clash.rows[0].name + '". Use that name.');
  const r = await client.query('INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id', [name, slug]);
  return r.rows[0].id;
}

async function nextSku(client, category) {
  const letters = category.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X');
  const prefix = 'PB-' + letters + '-';
  const { rows } = await client.query('SELECT sku FROM catalog_items WHERE sku LIKE $1', [prefix + '%']);
  let max = 0;
  for (const r of rows) {
    const n = parseInt(r.sku.slice(prefix.length), 10);
    if (n > max) max = n;
  }
  return prefix + String(max + 1).padStart(3, '0');
}

async function getItem(client, sku, lock) {
  const { rows } = await client.query('SELECT * FROM catalog_items WHERE sku = $1' + (lock ? ' FOR UPDATE' : ''), [sku]);
  if (!rows[0]) throw new HttpError(404, 'item_not_found', 'Product not found');
  return rows[0];
}

const linkSchema = z.object({
  url: z.string().trim().max(500).url().refine((u) => u.startsWith('https://'), 'Use a link that starts with https://'),
  label: text(60).optional(),
  name: text(60).optional(),
});
const fieldSchema = z.object({ label: text(60).optional(), name: text(60).optional() });

// Takes an image either as an uploaded file (stored on Cloudinary) or as a pasted https link.
async function takeImage(req, res, folder) {
  if (req.is('multipart/form-data')) {
    if (!uploadsReady()) throw new HttpError(503, 'uploads_unavailable', 'Uploads are not available right now');
    await receive(req, res);
    if (!req.file) throw new HttpError(400, 'file_missing', 'Attach one image in the "file" field');
    const f = parse(fieldSchema, req.body || {});
    const info = await checkFile(req.file.buffer);
    if (info.raw) throw new HttpError(415, 'images_only', 'Only PNG, JPG or WebP images are allowed here');
    const stored = await storeFile(req.file.buffer, info, folder);
    return { url: stored.url, publicId: stored.publicId, mime: stored.mime, label: f.label || null, name: f.name || null };
  }
  const b = parse(linkSchema, req.body || {});
  return { url: b.url, publicId: null, mime: null, label: b.label || null, name: b.name || null };
}

const shapeImage = (r) => ({
  id: String(r.id), position: r.position, url: imgUrl(r.file_name), label: r.label, status: r.status,
  archivedAt: r.archived_at, archivedBy: r.archived_by, archiveReason: r.archive_reason,
});
const shapeDesign = (r) => ({
  id: String(r.id), position: r.position, name: r.name, url: r.url, status: r.status === 'active' ? 'active' : 'archived',
  archivedAt: r.archived_at, archivedBy: r.archived_by,
});
const newestFirst = (a, b) => new Date(b.archivedAt || 0) - new Date(a.archivedAt || 0);

// ---------- lists for the screen ----------
router_lists();
function router_lists() {
  partnerCatalogRoutes.get('/categories', asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT name FROM categories ORDER BY name');
    res.json({ categories: rows.map((r) => r.name) });
  }));
  partnerCatalogRoutes.get('/storefronts', asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT code FROM storefronts ORDER BY code');
    res.json({ storefronts: rows.map((r) => r.code) });
  }));
}

const listSchema = z.object({
  q: text(80).optional(),
  status: z.enum(['active', 'draft', 'all']).default('all'),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(30),
  category: z.string().trim().regex(/^[a-z0-9-]+$/).max(80).optional(),
  sub: text(60).optional(),
});

partnerCatalogRoutes.get('/items', asyncHandler(async (req, res) => {
  const f = parse(listSchema, req.query);
  const params = [];
  const conds = [];
  if (f.status !== 'all') { params.push(f.status); conds.push('i.status = $' + params.length); }
  if (f.q) {
    params.push('%' + f.q.replace(/[\\%_]/g, '\\$&') + '%');
    conds.push('(i.name ILIKE $' + params.length + ' OR i.sku ILIKE $' + params.length + ' OR c.name ILIKE $' + params.length + ')');
  }
  if (f.category) { params.push(f.category); conds.push("c.slug = $" + params.length); }
  if (f.sub) { params.push(f.sub); conds.push("lower(trim(i.subcategory)) = lower($" + params.length + ")"); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const total = await query('SELECT count(*)::int AS n FROM catalog_items i JOIN categories c ON c.id = i.category_id ' + where, params);
  params.push(f.limit, (f.page - 1) * f.limit);
  const { rows } = await query(
    `SELECT i.sku, i.name, i.type, i.status, i.price_type, i.price_kes, i.stock_status, i.subcategory, c.name AS category,
            (SELECT file_name FROM item_images WHERE item_id = i.id AND status = 'active' ORDER BY position LIMIT 1) AS image,
            (SELECT count(*)::int FROM item_images WHERE item_id = i.id AND status = 'active') AS image_count,
            (SELECT count(*)::int FROM item_designs WHERE item_id = i.id AND status = 'active') AS design_count
       FROM catalog_items i JOIN categories c ON c.id = i.category_id ${where}
      ORDER BY i.updated_at DESC NULLS LAST, i.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  res.json({
    items: rows.map((r) => ({
      sku: r.sku, name: r.name, type: r.type, status: r.status, category: r.category, subcategory: r.subcategory, stockStatus: r.stock_status, priceType: r.price_type, priceKes: r.price_kes,
      image: imgUrl(r.image), imageCount: r.image_count, designCount: r.design_count,
    })),
    page: f.page, limit: f.limit, total: total.rows[0].n,
  });
}));

partnerCatalogRoutes.get('/items/:sku', asyncHandler(async (req, res) => {
  const sku = skuParam(req);
  const found = await query('SELECT i.*, c.name AS category_name FROM catalog_items i JOIN categories c ON c.id = i.category_id WHERE i.sku = $1', [sku]);
  const i = found.rows[0];
  if (!i) throw new HttpError(404, 'item_not_found', 'Product not found');
  const sf = await query('SELECT storefront_code FROM item_storefronts WHERE item_id = $1 ORDER BY storefront_code', [i.id]);
  const im = await query('SELECT id, position, file_name, label, status, archived_at, archived_by, archive_reason FROM item_images WHERE item_id = $1 ORDER BY position, id', [i.id]);
  const ds = await query('SELECT id, position, name, url, status, archived_at, archived_by FROM item_designs WHERE item_id = $1 ORDER BY position, id', [i.id]);
  const images = im.rows.map(shapeImage);
  const designs = ds.rows.map(shapeDesign);
  res.json({
    item: {
      sku: i.sku, name: i.name, type: i.type, status: i.status, category: i.category_name, subcategory: i.subcategory,
      description: i.description, features: i.features || [], priceType: i.price_type, priceKes: i.price_kes,
      compareAtPriceKes: i.compare_at_price_kes, minOrderQty: i.min_order_qty, options: i.options, personalization: i.personalization,
      stockStatus: i.stock_status, stockQty: i.stock_qty, leadTimeDays: i.lead_time_days, tags: i.tags, featured: i.featured,
      vendor: i.vendor_code, storefronts: sf.rows.map((r) => r.storefront_code), updatedAt: i.updated_at,
    },
    images: { current: images.filter((x) => x.status === 'active'), archive: images.filter((x) => x.status !== 'active').sort(newestFirst) },
    designs: { current: designs.filter((x) => x.status === 'active'), archive: designs.filter((x) => x.status !== 'active').sort(newestFirst) },
  });
}));

// ---------- create, edit, publish ----------
partnerCatalogRoutes.post('/items', limiter, asyncHandler(async (req, res) => {
  const b = parse(patchSchema, req.body);
  if (!b.name || !b.category) throw new HttpError(400, 'name_category_required', 'Give the product a name and a category');
  const f = {
    type: 'product', subcategory: null, description: '', features: [], priceType: 'fixed', priceKes: null, compareAtPriceKes: null,
    minOrderQty: 1, options: [], personalization: [], stockStatus: 'in_stock', stockQty: null, leadTimeDays: null, tags: [],
    featured: false, storefronts: [], vendor: null, ...b,
  };
  if (f.priceType === 'quote') { f.priceKes = null; f.compareAtPriceKes = null; }
  checkPrices(f);
  f.storefronts = [...new Set(f.storefronts)];
  await checkStorefronts(f.storefronts);
  const vendor = await vendorOf(f.vendor);

  const out = await withTransaction(async (client) => {
    const catId = await categoryId(client, f.category);
    const sku = await nextSku(client, f.category);
    const ins = await client.query(
      `INSERT INTO catalog_items (sku, type, name, category_id, subcategory, description, features, price_type, price_kes, compare_at_price_kes,
         min_order_qty, options, personalization, vendor_code, stock_status, stock_qty, lead_time_days, tags, featured, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15, $16, $17, $18, $19, 'draft') RETURNING id, sku`,
      [sku, f.type, f.name, catId, f.subcategory, f.description, f.features, f.priceType, f.priceKes, f.compareAtPriceKes,
        f.minOrderQty, JSON.stringify(f.options), f.personalization, vendor, f.stockStatus, f.stockQty, f.leadTimeDays, f.tags, f.featured]
    );
    if (f.storefronts.length) {
      await client.query('INSERT INTO item_storefronts (item_id, storefront_code) SELECT $1, unnest($2::text[])', [ins.rows[0].id, f.storefronts]);
    }
    return ins.rows[0];
  });
  await audit(req, { action: 'catalog.item_created', entityType: 'catalog_item', entityId: out.sku, actorUserId: req.user.id, details: { name: f.name } });
  res.status(201).json({ item: { sku: out.sku, status: 'draft' } });
}));

partnerCatalogRoutes.patch('/items/:sku', limiter, asyncHandler(async (req, res) => {
  const sku = skuParam(req);
  const b = parse(patchSchema, req.body);
  if (!Object.keys(b).length) throw new HttpError(400, 'nothing_to_change', 'Nothing to change');
  if (b.priceType === 'quote') { b.priceKes = null; b.compareAtPriceKes = null; }
  if (b.storefronts) { b.storefronts = [...new Set(b.storefronts)]; await checkStorefronts(b.storefronts); }
  const vendor = 'vendor' in b ? await vendorOf(b.vendor) : undefined;

  await withTransaction(async (client) => {
    const it = await getItem(client, sku, true);
    const next = {
      priceType: b.priceType ?? it.price_type,
      priceKes: 'priceKes' in b ? b.priceKes : it.price_kes,
      compareAtPriceKes: 'compareAtPriceKes' in b ? b.compareAtPriceKes : it.compare_at_price_kes,
    };
    const touchesPrice = next.priceType !== it.price_type || next.priceKes !== it.price_kes || next.compareAtPriceKes !== it.compare_at_price_kes;
    if (it.status === 'active' && touchesPrice) {
      throw new HttpError(409, 'price_needs_approval', 'This product is on sale. Price changes need approval from all three partners: send a price change request instead.');
    }
    checkPrices(next);
    const sets = [];
    const vals = [it.id];
    const add = (col, val, cast) => { vals.push(val); sets.push(col + ' = $' + vals.length + (cast || '')); };
    for (const [k, col] of Object.entries(COLUMNS)) if (k in b) add(col, b[k]);
    if ('options' in b) add('options', JSON.stringify(b.options), '::jsonb');
    if (b.category) add('category_id', await categoryId(client, b.category));
    if ('vendor' in b) add('vendor_code', vendor);
    if (sets.length) await client.query('UPDATE catalog_items SET ' + sets.join(', ') + ', updated_at = now() WHERE id = $1', vals);
    if (b.storefronts) {
      await client.query('DELETE FROM item_storefronts WHERE item_id = $1', [it.id]);
      if (b.storefronts.length) await client.query('INSERT INTO item_storefronts (item_id, storefront_code) SELECT $1, unnest($2::text[])', [it.id, b.storefronts]);
    }
  });
  await audit(req, { action: 'catalog.item_updated', entityType: 'catalog_item', entityId: sku, actorUserId: req.user.id, details: { fields: Object.keys(b) } });
  res.json({ sku, ok: true });
}));

partnerCatalogRoutes.post('/items/:sku/publish', limiter, asyncHandler(async (req, res) => {
  const sku = skuParam(req);
  await withTransaction(async (client) => {
    const it = await getItem(client, sku, true);
    if (it.status === 'active') throw new HttpError(409, 'already_active', 'This product is already on sale');
    const problems = [];
    if (it.price_type !== 'quote' && it.price_kes == null) problems.push('Enter a price');
    const sf = await client.query('SELECT count(*)::int AS n FROM item_storefronts WHERE item_id = $1', [it.id]);
    if (!sf.rows[0].n) problems.push('Choose at least one shop to list it in');
    const im = await client.query("SELECT count(*)::int AS n FROM item_images WHERE item_id = $1 AND status = 'active'", [it.id]);
    if (!im.rows[0].n) problems.push('Add at least one photo');
    if (problems.length) throw new HttpError(400, 'not_ready', 'Not ready to publish: ' + problems.join('; '), problems);
    await client.query("UPDATE catalog_items SET status = 'active', updated_at = now() WHERE id = $1", [it.id]);
  });
  await audit(req, { action: 'catalog.item_published', entityType: 'catalog_item', entityId: sku, actorUserId: req.user.id });
  res.json({ sku, status: 'active' });
}));

// ---------- photos ----------
partnerCatalogRoutes.post('/items/:sku/images', limiter, asyncHandler(async (req, res) => {
  const sku = skuParam(req);
  const got = await takeImage(req, res, 'pyfon/products');
  try {
    const row = await withTransaction(async (client) => {
      const it = await getItem(client, sku, true);
      const c = await client.query("SELECT coalesce(max(position), 0)::int AS p, count(*)::int AS n FROM item_images WHERE item_id = $1 AND status = 'active'", [it.id]);
      if (c.rows[0].n >= MAX_IMAGES) throw new HttpError(409, 'too_many_images', 'A product can have up to ' + MAX_IMAGES + ' photos. Remove one first.');
      const ins = await client.query(
        "INSERT INTO item_images (item_id, position, file_name, label, public_id, status) VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *",
        [it.id, c.rows[0].p + 1, got.url, got.label, got.publicId]
      );
      return ins.rows[0];
    });
    await audit(req, { action: 'catalog.image_added', entityType: 'catalog_item', entityId: sku, actorUserId: req.user.id, details: { imageId: String(row.id), uploaded: Boolean(got.publicId) } });
    res.status(201).json({ image: shapeImage(row) });
  } catch (err) {
    if (got.publicId) await removeFile(got.publicId, got.mime);
    throw err;
  }
}));

partnerCatalogRoutes.put('/items/:sku/images/order', limiter, asyncHandler(async (req, res) => {
  const sku = skuParam(req);
  const { order } = parse(z.object({ order: z.array(z.string().regex(/^\d{1,18}$/)).min(1).max(MAX_IMAGES) }), req.body);
  await withTransaction(async (client) => {
    const it = await getItem(client, sku, true);
    const cur = await client.query("SELECT id FROM item_images WHERE item_id = $1 AND status = 'active'", [it.id]);
    const have = new Set(cur.rows.map((r) => String(r.id)));
    if (new Set(order).size !== order.length || order.length !== have.size || !order.every((id) => have.has(id))) {
      throw new HttpError(400, 'order_mismatch', 'Send every current photo exactly once');
    }
    await client.query("UPDATE item_images SET position = position + 1000 WHERE item_id = $1 AND status = 'active'", [it.id]);
    for (let i = 0; i < order.length; i++) {
      await client.query('UPDATE item_images SET position = $1 WHERE id = $2 AND item_id = $3', [i + 1, order[i], it.id]);
    }
  });
  await audit(req, { action: 'catalog.images_reordered', entityType: 'catalog_item', entityId: sku, actorUserId: req.user.id });
  res.json({ ok: true });
}));

partnerCatalogRoutes.patch('/items/:sku/images/:id', limiter, asyncHandler(async (req, res) => {
  const sku = skuParam(req);
  const id = idParam(req);
  const { label } = parse(z.object({ label: text(60).nullable() }), req.body);
  const r = await query(
    "UPDATE item_images SET label = $3 WHERE id = $1 AND status = 'active' AND item_id = (SELECT id FROM catalog_items WHERE sku = $2) RETURNING id",
    [id, sku, label || null]
  );
  if (!r.rows[0]) throw new HttpError(404, 'image_not_found', 'Photo not found');
  res.json({ ok: true });
}));

partnerCatalogRoutes.post('/items/:sku/images/:id/replace', limiter, asyncHandler(async (req, res) => {
  const sku = skuParam(req);
  const id = idParam(req);
  const got = await takeImage(req, res, 'pyfon/products');
  try {
    const row = await withTransaction(async (client) => {
      const it = await getItem(client, sku, true);
      const old = await client.query("SELECT id, position, label FROM item_images WHERE id = $1 AND item_id = $2 AND status = 'active' FOR UPDATE", [id, it.id]);
      if (!old.rows[0]) throw new HttpError(404, 'image_not_found', 'Photo not found');
      await client.query("UPDATE item_images SET status = 'archived', archived_at = now(), archived_by = $2, archive_reason = 'Replaced' WHERE id = $1", [id, who(req)]);
      const ins = await client.query(
        "INSERT INTO item_images (item_id, position, file_name, label, public_id, status) VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *",
        [it.id, old.rows[0].position, got.url, got.label || old.rows[0].label, got.publicId]
      );
      return ins.rows[0];
    });
    await audit(req, { action: 'catalog.image_replaced', entityType: 'catalog_item', entityId: sku, actorUserId: req.user.id, details: { oldImageId: id, newImageId: String(row.id) } });
    res.status(201).json({ image: shapeImage(row) });
  } catch (err) {
    if (got.publicId) await removeFile(got.publicId, got.mime);
    throw err;
  }
}));

partnerCatalogRoutes.post('/items/:sku/images/:id/archive', limiter, asyncHandler(async (req, res) => {
  const sku = skuParam(req);
  const id = idParam(req);
  const { reason } = parse(z.object({ reason: text(200).optional() }), req.body || {});
  await withTransaction(async (client) => {
    const it = await getItem(client, sku, true);
    const im = await client.query("SELECT id FROM item_images WHERE id = $1 AND item_id = $2 AND status = 'active' FOR UPDATE", [id, it.id]);
    if (!im.rows[0]) throw new HttpError(404, 'image_not_found', 'Photo not found');
    if (it.status === 'active') {
      const n = await client.query("SELECT count(*)::int AS n FROM item_images WHERE item_id = $1 AND status = 'active'", [it.id]);
      if (n.rows[0].n <= 1) throw new HttpError(409, 'last_image', 'A product on sale needs at least one photo. Add the new photo first, or use Replace.');
    }
    await client.query("UPDATE item_images SET status = 'archived', archived_at = now(), archived_by = $2, archive_reason = $3 WHERE id = $1", [id, who(req), reason || 'Removed']);
  });
  await audit(req, { action: 'catalog.image_archived', entityType: 'catalog_item', entityId: sku, actorUserId: req.user.id, details: { imageId: id, reason: reason || null } });
  res.json({ ok: true });
}));

partnerCatalogRoutes.post('/items/:sku/images/:id/restore', limiter, asyncHandler(async (req, res) => {
  const sku = skuParam(req);
  const id = idParam(req);
  await withTransaction(async (client) => {
    const it = await getItem(client, sku, true);
    const im = await client.query("SELECT id FROM item_images WHERE id = $1 AND item_id = $2 AND status = 'archived' FOR UPDATE", [id, it.id]);
    if (!im.rows[0]) throw new HttpError(404, 'image_not_found', 'Archived photo not found');
    const c = await client.query("SELECT coalesce(max(position), 0)::int AS p, count(*)::int AS n FROM item_images WHERE item_id = $1 AND status = 'active'", [it.id]);
    if (c.rows[0].n >= MAX_IMAGES) throw new HttpError(409, 'too_many_images', 'A product can have up to ' + MAX_IMAGES + ' photos. Archive one first.');
    await client.query("UPDATE item_images SET status = 'active', position = $2, archived_at = NULL, archived_by = NULL, archive_reason = NULL WHERE id = $1", [id, c.rows[0].p + 1]);
  });
  await audit(req, { action: 'catalog.image_restored', entityType: 'catalog_item', entityId: sku, actorUserId: req.user.id, details: { imageId: id } });
  res.json({ ok: true });
}));

// ---------- designs (ready-made designs a customer can choose to have printed) ----------
partnerCatalogRoutes.post('/items/:sku/designs', limiter, asyncHandler(async (req, res) => {
  const sku = skuParam(req);
  const got = await takeImage(req, res, 'pyfon/designs');
  try {
    if (!got.name || got.name.length < 2) throw new HttpError(400, 'name_required', 'Give the design a name');
    const row = await withTransaction(async (client) => {
      const it = await getItem(client, sku, true);
      const c = await client.query("SELECT coalesce(max(position), 0)::int AS p, count(*)::int AS n FROM item_designs WHERE item_id = $1 AND status = 'active'", [it.id]);
      if (c.rows[0].n >= MAX_DESIGNS) throw new HttpError(409, 'too_many_designs', 'A product can have up to ' + MAX_DESIGNS + ' designs. Remove one first.');
      const ins = await client.query(
        "INSERT INTO item_designs (item_id, position, name, url, public_id, status) VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *",
        [it.id, c.rows[0].p + 1, got.name, got.url, got.publicId]
      );
      return ins.rows[0];
    });
    await audit(req, { action: 'catalog.design_added', entityType: 'catalog_item', entityId: sku, actorUserId: req.user.id, details: { designId: String(row.id), name: got.name } });
    res.status(201).json({ design: shapeDesign(row) });
  } catch (err) {
    if (got.publicId) await removeFile(got.publicId, got.mime);
    throw err;
  }
}));

partnerCatalogRoutes.patch('/items/:sku/designs/:id', limiter, asyncHandler(async (req, res) => {
  const sku = skuParam(req);
  const id = idParam(req);
  const { name } = parse(z.object({ name: z.string().trim().min(2).max(60) }), req.body);
  const r = await query(
    "UPDATE item_designs SET name = $3 WHERE id = $1 AND item_id = (SELECT id FROM catalog_items WHERE sku = $2) RETURNING id",
    [id, sku, name]
  );
  if (!r.rows[0]) throw new HttpError(404, 'design_not_found', 'Design not found');
  res.json({ ok: true });
}));

partnerCatalogRoutes.post('/items/:sku/designs/:id/archive', limiter, asyncHandler(async (req, res) => {
  const sku = skuParam(req);
  const id = idParam(req);
  await withTransaction(async (client) => {
    const it = await getItem(client, sku, true);
    const r = await client.query(
      "UPDATE item_designs SET status = 'hidden', archived_at = now(), archived_by = $3 WHERE id = $1 AND item_id = $2 AND status = 'active' RETURNING id",
      [id, it.id, who(req)]
    );
    if (!r.rows[0]) throw new HttpError(404, 'design_not_found', 'Design not found');
  });
  await audit(req, { action: 'catalog.design_archived', entityType: 'catalog_item', entityId: sku, actorUserId: req.user.id, details: { designId: id } });
  res.json({ ok: true });
}));

partnerCatalogRoutes.post('/items/:sku/designs/:id/restore', limiter, asyncHandler(async (req, res) => {
  const sku = skuParam(req);
  const id = idParam(req);
  await withTransaction(async (client) => {
    const it = await getItem(client, sku, true);
    const c = await client.query("SELECT coalesce(max(position), 0)::int AS p, count(*)::int AS n FROM item_designs WHERE item_id = $1 AND status = 'active'", [it.id]);
    if (c.rows[0].n >= MAX_DESIGNS) throw new HttpError(409, 'too_many_designs', 'A product can have up to ' + MAX_DESIGNS + ' designs. Archive one first.');
    const r = await client.query(
      "UPDATE item_designs SET status = 'active', position = $3, archived_at = NULL, archived_by = NULL WHERE id = $1 AND item_id = $2 AND status = 'hidden' RETURNING id",
      [id, it.id, c.rows[0].p + 1]
    );
    if (!r.rows[0]) throw new HttpError(404, 'design_not_found', 'Archived design not found');
  });
  await audit(req, { action: 'catalog.design_restored', entityType: 'catalog_item', entityId: sku, actorUserId: req.user.id, details: { designId: id } });
  res.json({ ok: true });
}));

// ---------- menu placement ----------
partnerCatalogRoutes.get('/menu', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id, parent_id, slug, title, link FROM taxonomy_nodes ORDER BY position, id');
  const byId = new Map(rows.map((r) => [String(r.id), r]));
  const trail = (r) => {
    const parts = [r.title];
    let p = r.parent_id == null ? null : byId.get(String(r.parent_id));
    while (p) { parts.unshift(p.title); p = p.parent_id == null ? null : byId.get(String(p.parent_id)); }
    return parts.join(' > ');
  };
  res.json({ nodes: rows.filter((r) => !r.link).map((r) => ({ slug: r.slug, path: trail(r) })) });
}));

partnerCatalogRoutes.get('/items/:sku/menu', asyncHandler(async (req, res) => {
  const sku = skuParam(req);
  const { rows } = await query(
    'SELECT n.slug FROM item_nodes x JOIN taxonomy_nodes n ON n.id = x.node_id JOIN catalog_items i ON i.id = x.item_id WHERE i.sku = $1 ORDER BY n.slug',
    [sku]
  );
  res.json({ slugs: rows.map((r) => r.slug) });
}));

partnerCatalogRoutes.put('/items/:sku/menu', limiter, asyncHandler(async (req, res) => {
  const sku = skuParam(req);
  const { slugs } = parse(z.object({ slugs: z.array(z.string().regex(/^[a-z0-9-]+$/).max(80)).max(12) }), req.body);
  const unique = [...new Set(slugs)];
  await withTransaction(async (client) => {
    const it = await getItem(client, sku, true);
    const nodes = unique.length
      ? await client.query('SELECT id, slug FROM taxonomy_nodes WHERE slug = ANY($1::text[]) AND link IS NULL', [unique])
      : { rows: [] };
    if (nodes.rows.length !== unique.length) throw new HttpError(400, 'unknown_menu', 'One of those menu places does not exist');
    await client.query('DELETE FROM item_menu_picks WHERE item_id = $1', [it.id]);
    await client.query('DELETE FROM item_nodes WHERE item_id = $1', [it.id]);
    for (const n of nodes.rows) {
      await client.query('INSERT INTO item_menu_picks (item_id, node_slug) VALUES ($1, $2)', [it.id, n.slug]);
      await client.query('INSERT INTO item_nodes (item_id, node_id) VALUES ($1, $2)', [it.id, n.id]);
    }
  });
  await audit(req, { action: 'catalog.menu_set', entityType: 'catalog_item', entityId: sku, actorUserId: req.user.id, details: { slugs: unique } });
  res.json({ ok: true, slugs: unique });
}));

// ---------- designs chosen on a job (for Creative and Production) ----------
partnerCatalogRoutes.get('/jobs/:ref/designs', asyncHandler(async (req, res) => {
  if (!/^JOB-\d{6,}$/.test(req.params.ref)) throw new HttpError(404, 'job_not_found', 'Job not found');
  const { rows } = await query(
    `SELECT l.name, l.qty, l.options, l.personalization, l.design_name, l.design_url
       FROM jobs j JOIN order_lines l ON l.order_id = j.order_id
      WHERE j.ref = $1 AND l.design_name IS NOT NULL ORDER BY l.id`,
    [req.params.ref]
  );
  res.json({ designs: rows.map((r) => ({ item: r.name, qty: r.qty, options: r.options, personalization: r.personalization, designName: r.design_name, designUrl: r.design_url })) });
}));

// ---------- category tree (renamed by id, so no route ever changes) ----------
const nameBody = z.object({ name: z.string().trim().min(2).max(60) });
const taken = (msg) => new HttpError(409, 'name_taken', msg);

async function syncSubcategories() {
  await query(`INSERT INTO subcategories (category_id, name)
    SELECT DISTINCT ON (i.category_id, lower(trim(i.subcategory))) i.category_id, trim(i.subcategory)
    FROM catalog_items i WHERE i.subcategory IS NOT NULL AND trim(i.subcategory) <> ''
    ON CONFLICT DO NOTHING`);
}

partnerCatalogRoutes.get('/tree', asyncHandler(async (req, res) => {
  await syncSubcategories();
  const cats = await query('SELECT c.id, c.name, c.slug, count(i.id)::int AS n FROM categories c LEFT JOIN catalog_items i ON i.category_id = c.id GROUP BY c.id ORDER BY c.name');
  const subs = await query('SELECT s.id, s.category_id, s.name, count(i.id)::int AS n FROM subcategories s LEFT JOIN catalog_items i ON i.category_id = s.category_id AND lower(trim(i.subcategory)) = lower(s.name) GROUP BY s.id ORDER BY s.name');
  res.json({
    categories: cats.rows.map((c) => ({
      id: String(c.id), name: c.name, slug: c.slug, count: c.n,
      subs: subs.rows.filter((s) => String(s.category_id) === String(c.id)).map((s) => ({ id: String(s.id), name: s.name, count: s.n })),
    })),
  });
}));

partnerCatalogRoutes.post('/groups/categories', limiter, asyncHandler(async (req, res) => {
  const { name } = parse(nameBody, req.body);
  const slug = slugify(name);
  if (!slug) throw new HttpError(400, 'bad_category', 'Use letters or numbers in the name');
  const clash = await query('SELECT name FROM categories WHERE slug = $1 OR lower(name) = lower($2)', [slug, name]);
  if (clash.rows[0]) throw taken('There is already a category called "' + clash.rows[0].name + '"');
  const r = await query('INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id', [name, slug]);
  await audit(req, { action: 'catalog.category_added', entityType: 'category', entityId: String(r.rows[0].id), actorUserId: req.user.id, details: { name } });
  res.status(201).json({ ok: true });
}));

partnerCatalogRoutes.patch('/groups/categories/:id', limiter, asyncHandler(async (req, res) => {
  const id = idParam(req);
  const { name } = parse(nameBody, req.body);
  const old = await query('SELECT name FROM categories WHERE id = $1', [id]);
  if (!old.rows[0]) throw new HttpError(404, 'not_found', 'Category not found');
  const clash = await query('SELECT 1 FROM categories WHERE lower(name) = lower($1) AND id <> $2', [name, id]);
  if (clash.rows[0]) throw taken('There is already a category with that name');
  await query('UPDATE categories SET name = $1 WHERE id = $2', [name, id]);
  await audit(req, { action: 'catalog.category_renamed', entityType: 'category', entityId: id, actorUserId: req.user.id, details: { from: old.rows[0].name, to: name } });
  res.json({ ok: true });
}));

partnerCatalogRoutes.post('/groups/categories/:id/subcategories', limiter, asyncHandler(async (req, res) => {
  const id = idParam(req);
  const { name } = parse(nameBody, req.body);
  const cat = await query('SELECT id FROM categories WHERE id = $1', [id]);
  if (!cat.rows[0]) throw new HttpError(404, 'not_found', 'Category not found');
  try { await query('INSERT INTO subcategories (category_id, name) VALUES ($1, $2)', [id, name]); }
  catch (e) { if (e && e.code === '23505') throw taken('That subcategory already exists in this category'); throw e; }
  await audit(req, { action: 'catalog.subcategory_added', entityType: 'category', entityId: id, actorUserId: req.user.id, details: { name } });
  res.status(201).json({ ok: true });
}));

partnerCatalogRoutes.patch('/groups/subcategories/:id', limiter, asyncHandler(async (req, res) => {
  const id = idParam(req);
  const { name } = parse(nameBody, req.body);
  let from = '';
  await withTransaction(async (client) => {
    const s = await client.query('SELECT id, category_id, name FROM subcategories WHERE id = $1 FOR UPDATE', [id]);
    if (!s.rows[0]) throw new HttpError(404, 'not_found', 'Subcategory not found');
    from = s.rows[0].name;
    const clash = await client.query('SELECT 1 FROM subcategories WHERE category_id = $1 AND lower(name) = lower($2) AND id <> $3', [s.rows[0].category_id, name, id]);
    if (clash.rows[0]) throw taken('That subcategory already exists in this category');
    await client.query('UPDATE subcategories SET name = $1 WHERE id = $2', [name, id]);
    await client.query('UPDATE catalog_items SET subcategory = $1, updated_at = now() WHERE category_id = $2 AND lower(trim(subcategory)) = lower($3)', [name, s.rows[0].category_id, from]);
  });
  await audit(req, { action: 'catalog.subcategory_renamed', entityType: 'category', entityId: id, actorUserId: req.user.id, details: { from, to: name } });
  res.json({ ok: true });
}));
