import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { asyncHandler } from '../errors.js';
import { parse } from '../validate.js';

// Drill-down browsing for the partner Products screen. Mounted under /v1/partner/catalog.
export const partnerBrowseRoutes = Router();
const imgUrl = (f) => (!f ? null : /^https?:/.test(f) ? f : '/images/' + f);
const shopCond = (n) => '($' + n + '::text IS NULL OR EXISTS (SELECT 1 FROM item_storefronts s WHERE s.item_id = i.id AND s.storefront_code = $' + n + '))';
const shopOf = (q) => (typeof q.shop === 'string' && /^[a-z0-9]{1,20}$/.test(q.shop) ? q.shop : null);

partnerBrowseRoutes.get('/browse/shops', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT st.code, count(s.item_id)::int AS n FROM storefronts st LEFT JOIN item_storefronts s ON s.storefront_code = st.code GROUP BY st.code ORDER BY st.code');
  const t = await query('SELECT count(*)::int AS n FROM catalog_items');
  res.json({ shops: rows.map((r) => ({ code: r.code, count: r.n })), total: t.rows[0].n });
}));

partnerBrowseRoutes.get('/browse/tree', asyncHandler(async (req, res) => {
  const shop = shopOf(req.query);
  await query(`INSERT INTO subcategories (category_id, name)
    SELECT DISTINCT ON (i.category_id, lower(trim(i.subcategory))) i.category_id, trim(i.subcategory)
    FROM catalog_items i WHERE i.subcategory IS NOT NULL AND trim(i.subcategory) <> '' ON CONFLICT DO NOTHING`);
  const cats = await query('SELECT c.id, c.name, c.slug, count(i.id)::int AS n FROM categories c LEFT JOIN catalog_items i ON i.category_id = c.id AND ' + shopCond(1) + ' GROUP BY c.id ORDER BY c.name', [shop]);
  const subs = await query('SELECT s.id, s.category_id, s.name, count(i.id)::int AS n FROM subcategories s LEFT JOIN catalog_items i ON i.category_id = s.category_id AND lower(trim(i.subcategory)) = lower(s.name) AND ' + shopCond(1) + ' WHERE s.parent_id IS NULL GROUP BY s.id ORDER BY s.name', [shop]);
  const none = await query("SELECT i.category_id, count(*)::int AS n FROM catalog_items i WHERE (i.subcategory IS NULL OR trim(i.subcategory) = '') AND " + shopCond(1) + ' GROUP BY i.category_id', [shop]);
  const nm = new Map(none.rows.map((r) => [String(r.category_id), r.n]));
  const all = shop ? await Promise.all([query('SELECT category_id, count(*)::int AS n FROM catalog_items GROUP BY category_id'), query("SELECT category_id, lower(trim(subcategory)) AS k, count(*)::int AS n FROM catalog_items WHERE subcategory IS NOT NULL AND trim(subcategory) <> '' GROUP BY 1, 2")]) : null;
  const catAll = new Map(all ? all[0].rows.map((r) => [String(r.category_id), r.n]) : []);
  const subAll = new Map(all ? all[1].rows.map((r) => [String(r.category_id) + '|' + r.k, r.n]) : []);
  const keepCat = (c) => !shop || c.n > 0 || !(catAll.get(String(c.id)) > 0);
  const keepSub = (x) => !shop || x.n > 0 || !(subAll.get(String(x.category_id) + '|' + x.name.toLowerCase().trim()) > 0);
  res.json({
    categories: cats.rows.filter(keepCat).map((c) => ({
      id: String(c.id), name: c.name, slug: c.slug, count: c.n, noSub: nm.get(String(c.id)) || 0,
      subs: subs.rows.filter((s) => String(s.category_id) === String(c.id)).filter(keepSub).map((s) => ({ id: String(s.id), name: s.name, count: s.n })),
    })),
  });
}));

const listSchema = z.object({
  shop: z.string().regex(/^[a-z0-9]{1,20}$/).optional(),
  category: z.string().regex(/^[a-z0-9-]{1,80}$/).optional(),
  sub: z.string().trim().max(60).optional(),
  node: z.string().regex(/^[a-z0-9-]{1,80}$/).optional(),
  status: z.enum(['active', 'draft', 'all']).default('all'),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});

partnerBrowseRoutes.get('/browse/items', asyncHandler(async (req, res) => {
  const f = parse(listSchema, req.query);
  const params = [f.shop || null];
  const conds = [shopCond(1)];
  if (f.status !== 'all') { params.push(f.status); conds.push('i.status = $' + params.length); }
  if (f.category) { params.push(f.category); conds.push('c.slug = $' + params.length); }
  if (f.node) { params.push('node:' + f.node); conds.push('$' + params.length + '::text = ANY(i.tags)'); }
  if (f.sub === '__none__') conds.push("(i.subcategory IS NULL OR trim(i.subcategory) = '')");
  else if (f.sub) { params.push(f.sub); conds.push('lower(trim(i.subcategory)) = lower($' + params.length + ')'); }
  if (f.q) { params.push('%' + f.q.replace(/[\\%_]/g, '\\$&') + '%'); conds.push('(i.name ILIKE $' + params.length + ' OR i.sku ILIKE $' + params.length + ')'); }
  const where = 'WHERE ' + conds.join(' AND ');
  const total = await query('SELECT count(*)::int AS n FROM catalog_items i JOIN categories c ON c.id = i.category_id ' + where, params);
  params.push(f.limit, (f.page - 1) * f.limit);
  const { rows } = await query(
    `SELECT i.sku, i.name, i.type, i.status, i.price_type, i.price_kes, i.stock_status, i.stock_qty, i.lead_time_days, i.vendor_code,
            i.tags, i.featured, i.subcategory, c.name AS category,
            (SELECT coalesce(array_agg(storefront_code ORDER BY storefront_code), '{}') FROM item_storefronts WHERE item_id = i.id) AS shops,
            (SELECT file_name FROM item_images WHERE item_id = i.id AND status = 'active' ORDER BY position LIMIT 1) AS image
       FROM catalog_items i JOIN categories c ON c.id = i.category_id ${where}
      ORDER BY i.updated_at DESC NULLS LAST, i.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  res.json({
    items: rows.map((r) => ({
      sku: r.sku, name: r.name, type: r.type, status: r.status, category: r.category, subcategory: r.subcategory, priceType: r.price_type, priceKes: r.price_kes,
      stockStatus: r.stock_status, stockQty: r.stock_qty, leadTimeDays: r.lead_time_days, vendor: r.vendor_code, tags: r.tags || [], featured: r.featured, shops: r.shops || [], image: imgUrl(r.image),
    })),
    page: f.page, limit: f.limit, total: total.rows[0].n,
  });
}));

// 7c22: deeper subcategory levels
import { HttpError } from '../errors.js';
import { audit } from '../audit.js';
const SLUGSQL = "trim(both '-' from regexp_replace(lower(s.name), '[^a-z0-9]+', '-', 'g'))";
const CASESQL = "(CASE WHEN s.parent_id IS NULL THEN lower(trim(i.subcategory)) = lower(s.name) ELSE ('node:' || " + SLUGSQL + ") = ANY(i.tags) END)";
const CNTSQL = 'SELECT count(*)::int FROM catalog_items i WHERE i.category_id = s.category_id AND ' + CASESQL;
partnerBrowseRoutes.get('/browse/nodes', asyncHandler(async (req, res) => {
  const shop = shopOf(req.query);
  const cat = typeof req.query.category === 'string' && /^[a-z0-9-]{1,80}$/.test(req.query.category) ? req.query.category : null;
  if (!cat) throw new HttpError(400, 'bad_category', 'Choose a category');
  const { rows } = await query('SELECT s.id, s.parent_id, s.name, ' + SLUGSQL + ' AS slug, (' + CNTSQL + ' AND ' + shopCond(1) + ') AS n, (' + CNTSQL + ') AS t FROM subcategories s JOIN categories c ON c.id = s.category_id WHERE c.slug = $2 ORDER BY s.id', [shop, cat]);
  res.json({ nodes: rows.map((r) => ({ id: String(r.id), parentId: r.parent_id == null ? null : String(r.parent_id), name: r.name, slug: r.slug, count: r.n, total: r.t })) });
}));
partnerBrowseRoutes.post('/browse/nodes', asyncHandler(async (req, res) => {
  const b = parse(z.object({ category: z.string().regex(/^[a-z0-9-]{1,80}$/), parentId: z.string().regex(/^\d{1,18}$/).nullable().optional(), name: z.string().trim().min(2).max(60) }), req.body);
  const c = await query('SELECT id FROM categories WHERE slug = $1', [b.category]);
  if (!c.rows[0]) throw new HttpError(404, 'not_found', 'Category not found');
  if (b.parentId) {
    const p = await query('SELECT 1 FROM subcategories WHERE id = $1 AND category_id = $2', [b.parentId, c.rows[0].id]);
    if (!p.rows[0]) throw new HttpError(404, 'not_found', 'Parent not found');
  }
  try { await query('INSERT INTO subcategories (category_id, name, parent_id) VALUES ($1, $2, $3)', [c.rows[0].id, b.name, b.parentId || null]); }
  catch (e) { if (e && e.code === '23505') throw new HttpError(409, 'name_taken', 'That name already exists here'); throw e; }
  await audit(req, { action: 'catalog.subcategory_added', entityType: 'category', entityId: String(c.rows[0].id), actorUserId: req.user.id, details: { name: b.name, parentId: b.parentId || null } });
  res.status(201).json({ ok: true });
}));
