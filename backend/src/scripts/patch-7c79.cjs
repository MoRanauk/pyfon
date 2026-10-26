const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const errors = [];
const file = 'backend/src/routes/partnerCatalog.js';
const p = path.join(root, file);
if (!fs.existsSync(p)) errors.push('MISSING FILE ' + file);

const ANCHOR = `// ---------- designs (ready-made designs a customer can choose to have printed) ----------`;
const BLOCK = `// ---------- photos that show when a colour or size is chosen ----------
// Stored in item_option_images, which the public catalog and the shops already read (optionImages).
const MAX_OPTION_IMAGES = 8;
const optionPick = z.object({ optionName: z.string().trim().min(1).max(40), optionValue: z.string().trim().min(1).max(60) });
const optionPos = z.object({ optionName: z.string().trim().min(1).max(40), optionValue: z.string().trim().min(1).max(60), position: z.number().int().min(1).max(1000) });

async function checkOption(client, itemId, name, value) {
  const r = await client.query('SELECT options FROM catalog_items WHERE id = $1', [itemId]);
  const opts = Array.isArray(r.rows[0] && r.rows[0].options) ? r.rows[0].options : [];
  const g = opts.find((o) => o && o.name === name);
  if (!g || !Array.isArray(g.values) || !g.values.includes(value)) {
    throw new HttpError(400, 'unknown_option', 'This product has no option "' + name + ': ' + value + '". Add it to the product options first.');
  }
}

partnerCatalogRoutes.get('/items/:sku/option-images', asyncHandler(async (req, res) => {
  const sku = skuParam(req);
  const { rows } = await query(
    'SELECT o.option_name, o.option_value, o.position, o.file_name FROM item_option_images o JOIN catalog_items i ON i.id = o.item_id WHERE i.sku = $1 ORDER BY o.option_name, o.option_value, o.position',
    [sku]
  );
  res.json({ optionImages: rows.map((r) => ({ optionName: r.option_name, optionValue: r.option_value, position: r.position, url: imgUrl(r.file_name) })) });
}));

partnerCatalogRoutes.post('/items/:sku/option-images', limiter, asyncHandler(async (req, res) => {
  const sku = skuParam(req);
  const got = await takeImage(req, res, 'pyfon/products');
  try {
    const pick = parse(optionPick, req.body || {});
    const out = await withTransaction(async (client) => {
      const it = await getItem(client, sku, true);
      await checkOption(client, it.id, pick.optionName, pick.optionValue);
      const c = await client.query(
        'SELECT coalesce(max(position), 0)::int AS p, count(*)::int AS n FROM item_option_images WHERE item_id = $1 AND option_name = $2 AND option_value = $3',
        [it.id, pick.optionName, pick.optionValue]
      );
      if (c.rows[0].n >= MAX_OPTION_IMAGES) throw new HttpError(409, 'too_many_images', 'Up to ' + MAX_OPTION_IMAGES + ' photos for one choice. Remove one first.');
      const pos = c.rows[0].p + 1;
      await client.query(
        'INSERT INTO item_option_images (item_id, option_name, option_value, position, file_name) VALUES ($1, $2, $3, $4, $5)',
        [it.id, pick.optionName, pick.optionValue, pos, got.url]
      );
      return { optionName: pick.optionName, optionValue: pick.optionValue, position: pos, url: imgUrl(got.url) };
    });
    await audit(req, { action: 'catalog.option_image_added', entityType: 'catalog_item', entityId: sku, actorUserId: req.user.id, details: { option: pick.optionName + ': ' + pick.optionValue, uploaded: Boolean(got.publicId) } });
    res.status(201).json({ image: out });
  } catch (err) {
    if (got.publicId) await removeFile(got.publicId, got.mime);
    throw err;
  }
}));

// Removing only unlinks the photo from that choice. The uploaded file itself is kept.
partnerCatalogRoutes.post('/items/:sku/option-images/remove', limiter, asyncHandler(async (req, res) => {
  const sku = skuParam(req);
  const b = parse(optionPos, req.body || {});
  const r = await query(
    'DELETE FROM item_option_images WHERE item_id = (SELECT id FROM catalog_items WHERE sku = $1) AND option_name = $2 AND option_value = $3 AND position = $4 RETURNING position',
    [sku, b.optionName, b.optionValue, b.position]
  );
  if (!r.rows[0]) throw new HttpError(404, 'image_not_found', 'Photo not found');
  await audit(req, { action: 'catalog.option_image_removed', entityType: 'catalog_item', entityId: sku, actorUserId: req.user.id, details: { option: b.optionName + ': ' + b.optionValue } });
  res.json({ ok: true });
}));

`;

let out = '';
let label = '';
if (!errors.length) {
  const raw = fs.readFileSync(p, 'utf8');
  const crlf = raw.includes('\r\n');
  let t = raw.replace(/\r\n/g, '\n');
  if (t.includes('/option-images/remove')) { label = ' (already done)'; }
  else {
    const c = t.split(ANCHOR).length - 1;
    if (c !== 1) errors.push('NOT FOUND (' + c + ') in ' + file + ': designs comment line');
    else { t = t.split(ANCHOR).join(BLOCK + ANCHOR); label = ' (3 routes added)'; }
  }
  out = crlf ? t.replace(/\n/g, '\r\n') : t;
}
if (errors.length) { errors.forEach((e) => console.log(e)); console.log('FAIL: nothing written'); process.exit(1); }
fs.writeFileSync(p, out, 'utf8');
console.log('Patched ' + file + label);
console.log('PASS: option photo routes patched');
