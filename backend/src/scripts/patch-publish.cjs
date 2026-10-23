const fs = require('fs');
const path = require('path');
const fp = path.resolve(process.cwd(), 'src', 'routes', 'partnerCatalog.js');
let t = fs.readFileSync(fp, 'utf8');
const crlf = t.includes('\r\n');
t = t.replace(/\r\n/g, '\n');
const edits = [
  { done: "NOT ILIKE '%placeholder%'", re: /const im = await client\.query\("SELECT count\(\*\)::int AS n FROM item_images WHERE item_id = \$1 AND status = 'active'", \[it\.id\]\);/,
    add: "const im = await client.query(\"SELECT count(*)::int AS n FROM item_images WHERE item_id = $1 AND status = 'active' AND file_name NOT ILIKE '%placeholder%'\", [it.id]);" },
  { done: 'real photo', old: "problems.push('Add at least one photo')", add: "problems.push('Add at least one real photo (the grey starter photo does not count)')" },
  { done: "array_remove(tags, 'needs-photo')", old: "\"UPDATE catalog_items SET status = 'active', updated_at = now() WHERE id = $1\"", add: "\"UPDATE catalog_items SET status = 'active', tags = array_remove(tags, 'needs-photo'), updated_at = now() WHERE id = $1\"" },
];
let miss = false;
for (const e of edits) {
  if (t.includes(e.done)) { console.log('Already done: ' + e.done); continue; }
  if (e.re) {
    if (!e.re.test(t)) { console.log('NOT FOUND: ' + e.done); miss = true; continue; }
    t = t.replace(e.re, () => e.add);
  } else {
    if (!t.includes(e.old)) { console.log('NOT FOUND: ' + e.done); miss = true; continue; }
    t = t.replace(e.old, () => e.add);
  }
  console.log('Patched: ' + e.done);
}
if (miss) { console.log('Nothing written.'); process.exit(1); }
fs.writeFileSync(fp, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PASS');
