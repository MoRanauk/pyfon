import fs from 'node:fs';
const f = 'src/routes/partnerBrowse.js';
let s = fs.readFileSync(f, 'utf8');
let bad = 0;
function patch(name, find, make) {
  if (s.includes('keepCat') && name === 'insert') { console.log('Already done: ' + name); return; }
  if (!s.includes(find)) { console.log('NOT FOUND: ' + name); bad = 1; return; }
  s = s.replace(find, make);
  console.log('Patched: ' + name);
}
const nl = '\r\n';
const anchor = "  const nm = new Map(none.rows.map((r) => [String(r.category_id), r.n]));";
const add = [
  "  const all = shop ? await Promise.all([query('SELECT category_id, count(*)::int AS n FROM catalog_items GROUP BY category_id'), query(\"SELECT category_id, lower(trim(subcategory)) AS k, count(*)::int AS n FROM catalog_items WHERE subcategory IS NOT NULL AND trim(subcategory) <> '' GROUP BY 1, 2\")]) : null;",
  "  const catAll = new Map(all ? all[0].rows.map((r) => [String(r.category_id), r.n]) : []);",
  "  const subAll = new Map(all ? all[1].rows.map((r) => [String(r.category_id) + '|' + r.k, r.n]) : []);",
  "  const keepCat = (c) => !shop || c.n > 0 || !(catAll.get(String(c.id)) > 0);",
  "  const keepSub = (x) => !shop || x.n > 0 || !(subAll.get(String(x.category_id) + '|' + x.name.toLowerCase().trim()) > 0);",
].join(nl);
patch('insert', anchor, () => anchor + nl + add);
patch('categories', 'categories: cats.rows.map(', () => 'categories: cats.rows.filter(keepCat).map(');
patch('subs', 'subs: subs.rows.filter((s) => String(s.category_id) === String(c.id))', () => 'subs: subs.rows.filter((s) => String(s.category_id) === String(c.id)).filter(keepSub)');
if (bad) process.exit(1);
fs.writeFileSync(f, s);
