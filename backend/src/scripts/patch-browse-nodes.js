import fs from 'node:fs';
const f = 'src/routes/partnerBrowse.js';
let s = fs.readFileSync(f, 'utf8');
if (s.includes('/browse/nodes')) { console.log('Already done'); process.exit(0); }
let bad = 0;
function rep(name, find, to) { if (!s.includes(find)) { console.log('NOT FOUND: ' + name); bad = 1; return; } s = s.replace(find, () => to); console.log('Patched: ' + name); }
rep('root subs', " GROUP BY s.id ORDER BY s.name", " WHERE s.parent_id IS NULL GROUP BY s.id ORDER BY s.name");
rep('schema', "sub: z.string().trim().max(60).optional(),", "sub: z.string().trim().max(60).optional(),\r\n  node: z.string().regex(/^[a-z0-9-]{1,80}$/).optional(),");
rep('filter', "if (f.sub === '__none__')", "if (f.node) { params.push('node:' + f.node); conds.push('$' + params.length + '::text = ANY(i.tags)'); }\r\n  if (f.sub === '__none__')");
if (bad) process.exit(1);
s += `
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
  const b = parse(z.object({ category: z.string().regex(/^[a-z0-9-]{1,80}$/), parentId: z.string().regex(/^\\d{1,18}$/).nullable().optional(), name: z.string().trim().min(2).max(60) }), req.body);
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
`;
fs.writeFileSync(f, s);
