import fs from 'node:fs';
let bad = 0;
function patch(file, old, neu, label) {
  const t = fs.readFileSync(file, 'utf8');
  if (t.includes(neu)) { console.log('Already done: ' + label); return; }
  if (!t.includes(old)) { console.log('NOT FOUND: ' + label); bad++; return; }
  fs.writeFileSync(file, t.replace(old, () => neu));
  console.log('Patched: ' + label);
}
const FN = String.raw`function videoMap(records, errors) {
  const m = new Map();
  records.forEach((r, i) => {
    if (!('video_url' in r)) return;
    const u = String(r.video_url || '').trim();
    const sku = String(r.sku || '').trim();
    if (u && !/^https:\/\/\S+$/.test(u)) errors.push({ row: i + 2, sku, message: 'video_url: must start with https://' });
    m.set(sku, u || null);
  });
  return m;
}

`;
const c = 'src/routes/catalog.js';
patch(c, 'i.stock_status, i.lead_time_days, i.tags, i.featured, i.features,', 'i.stock_status, i.lead_time_days, i.tags, i.featured, i.features, i.video_url,', 'catalog select');
patch(c, '    image: images[0],', "    video: r.video_url || '',\n    image: images[0],", 'catalog shape');
const m = 'src/csv/importer.js';
patch(m, 'async function context(db) {', FN + 'async function context(db) {', 'importer function');
patch(m, '  const { errors, items } = validateAll(r.records, await context(db));', '  const { errors, items } = validateAll(r.records, await context(db));\n  const vids = videoMap(r.records, errors);', 'importer check');
patch(m, 'skipped: [], items };', 'skipped: [], items, videos: vids };', 'importer result');
patch(m, '    const id = r.rows[0].id;', "    const id = r.rows[0].id;\n    if (c.videos && c.videos.has(it.sku)) await client.query('UPDATE catalog_items SET video_url = $1 WHERE id = $2', [c.videos.get(it.sku), id]);", 'importer save');
patch(m, 'i.lead_time_days, i.tags, i.featured, i.status,', 'i.lead_time_days, i.tags, i.featured, i.status, i.video_url,', 'export select');
patch(m, "const lines = [COLUMNS.join(',')];", "const lines = [COLUMNS.join(',') + ',video_url'];", 'export header');
patch(m, "lines.push(COLUMNS.map((c) => q(v[c])).join(','));", "lines.push(COLUMNS.map((c) => q(v[c])).join(',') + ',' + q(r.video_url));", 'export row');
process.exit(bad ? 1 : 0);
