import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';

// Public, read-only catalog. No login needed. Only active items are ever shown,
// and only on the storefronts they are listed for.
const router = Router();

const listQuery = z.object({
  category: z.string().trim().max(80).optional(),
  node: z.string().trim().regex(/^[a-z0-9-]+$/).max(80).optional(),
  q: z.string().trim().max(80).optional(),
  type: z.enum(['product', 'service']).optional(),
  featured: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

const IN_STOREFRONT = 'EXISTS (SELECT 1 FROM item_storefronts s WHERE s.item_id = i.id AND s.storefront_code = $1)';

function imageUrls(files) {
  return files && files.length ? files.map((f) => '/images/' + f) : ['/images/placeholder.png'];
}

function shape(r) {
  const images = imageUrls(r.images);
  return {
    sku: r.sku,
    type: r.type,
    name: r.name,
    category: r.category,
    categorySlug: r.category_slug,
    subcategory: r.subcategory,
    description: r.description,
    priceType: r.price_type,
    priceKes: r.price_kes,
    compareAtPriceKes: r.compare_at_price_kes,
    minOrderQty: r.min_order_qty,
    options: r.options,
    personalization: r.personalization,
    stockStatus: r.stock_status,
    leadTimeDays: r.lead_time_days,
    tags: r.tags,
    featured: r.featured,
    image: images[0],
    images,
  };
}

const SELECT_ITEM = `
  SELECT i.sku, i.type, i.name, c.name AS category, c.slug AS category_slug, i.subcategory, i.description,
         i.price_type, i.price_kes, i.compare_at_price_kes, i.min_order_qty, i.options, i.personalization,
         i.stock_status, i.lead_time_days, i.tags, i.featured,
         COALESCE((SELECT array_agg(file_name ORDER BY position) FROM item_images WHERE item_id = i.id), '{}') AS images
  FROM catalog_items i
  JOIN categories c ON c.id = i.category_id`;

async function requireStorefront(req) {
  const code = req.params.storefront;
  const { rows } = await query('SELECT 1 FROM storefronts WHERE code = $1', [code]);
  if (!rows.length) throw new HttpError(404, 'not_found', 'Unknown storefront');
  return code;
}

router.get('/:storefront/categories', asyncHandler(async (req, res) => {
  const code = await requireStorefront(req);
  const { rows } = await query(
    `SELECT c.name, c.slug, count(*)::int AS item_count
     FROM categories c JOIN catalog_items i ON i.category_id = c.id
     WHERE i.status = 'active' AND ${IN_STOREFRONT}
     GROUP BY c.id ORDER BY c.name`,
    [code],
  );
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ categories: rows.map((r) => ({ name: r.name, slug: r.slug, itemCount: r.item_count })) });
}));

// The menu tree: groups, categories, sub-categories, any depth.
// Empty branches are hidden, except links (for example /sell).
router.get('/:storefront/tree', asyncHandler(async (req, res) => {
  const code = await requireStorefront(req);
  const nodes = (await query('SELECT id, parent_id, slug, title, link FROM taxonomy_nodes ORDER BY position, id')).rows;
  const links = (await query(
    `SELECT n.node_id, i.id AS item_id, i.featured,
            (SELECT file_name FROM item_images WHERE item_id = i.id ORDER BY position LIMIT 1) AS file
     FROM item_nodes n JOIN catalog_items i ON i.id = n.item_id
     WHERE i.status = 'active' AND ${IN_STOREFRONT}`,
    [code],
  )).rows;

  const byId = new Map(nodes.map((n) => [String(n.id), { ...n, children: [], items: new Map() }]));
  const roots = [];
  for (const n of byId.values()) {
    const parent = n.parent_id == null ? null : byId.get(String(n.parent_id));
    if (parent) parent.children.push(n);
    else roots.push(n);
  }
  for (const l of links) {
    const n = byId.get(String(l.node_id));
    if (n) n.items.set(String(l.item_id), { featured: l.featured, file: l.file });
  }

  function build(n) {
    const kids = n.children.map(build).filter(Boolean);
    for (const c of n.children) for (const [k, v] of c.items) n.items.set(k, v);
    if (!n.items.size && !n.link) return null;
    const list = [...n.items.values()].filter((x) => x.file);
    const pick = list.find((x) => x.featured) || list[0];
    return {
      key: n.slug,
      title: n.title,
      to: n.link || '/shop?node=' + n.slug,
      count: n.items.size,
      image: pick ? '/images/' + pick.file : '',
      children: kids,
    };
  }

  res.set('Cache-Control', 'public, max-age=60');
  res.json({ tree: roots.map(build).filter(Boolean) });
}));

router.get('/:storefront/items', asyncHandler(async (req, res) => {
  const code = await requireStorefront(req);
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, 'bad_request', 'Invalid filter', parsed.error.issues.map((i) => i.path.join('.') + ': ' + i.message));
  }
  const f = parsed.data;
  const params = [code];
  let where = `WHERE i.status = 'active' AND ${IN_STOREFRONT}`;
  if (f.category) {
    params.push(f.category);
    where += ` AND c.slug = $${params.length}`;
  }
  if (f.node) {
    params.push(f.node);
    where += ` AND EXISTS (SELECT 1 FROM item_nodes x WHERE x.item_id = i.id AND x.node_id IN (
      WITH RECURSIVE d AS (
        SELECT id FROM taxonomy_nodes WHERE slug = $${params.length}
        UNION ALL
        SELECT t.id FROM taxonomy_nodes t JOIN d ON t.parent_id = d.id
      ) SELECT id FROM d))`;
  }
  if (f.type) {
    params.push(f.type);
    where += ` AND i.type = $${params.length}`;
  }
  if (f.featured === 'true') where += ' AND i.featured = true';
  if (f.q) {
    params.push('%' + f.q.replace(/[\\%_]/g, '\\$&') + '%');
    const n = params.length;
    where += ` AND (i.name ILIKE $${n} OR i.description ILIKE $${n} OR c.name ILIKE $${n} OR EXISTS (SELECT 1 FROM unnest(i.tags) t WHERE t ILIKE $${n}))`;
  }
  const total = await query(
    `SELECT count(*)::int AS n FROM catalog_items i JOIN categories c ON c.id = i.category_id ${where}`,
    params,
  );
  params.push(f.limit, (f.page - 1) * f.limit);
  const { rows } = await query(
    `${SELECT_ITEM} ${where} ORDER BY i.featured DESC, i.id LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ items: rows.map(shape), page: f.page, limit: f.limit, total: total.rows[0].n });
}));

router.get('/:storefront/items/:sku', asyncHandler(async (req, res) => {
  const code = await requireStorefront(req);
  const { rows } = await query(
    `${SELECT_ITEM} WHERE i.status = 'active' AND ${IN_STOREFRONT} AND i.sku = $2`,
    [code, req.params.sku],
  );
  if (!rows.length) throw new HttpError(404, 'not_found', 'Item not found');
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ item: shape(rows[0]) });
}));

export default router;
