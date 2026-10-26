import { query } from '../db/pool.js';

// READ ONLY. Lists test data and what points at it. Changes nothing (SELECT only).
const TEST = [/@example\.com$/i, /@moblha\.com$/i, /@hopefunder\.com$/i, /\+d2@/i, /\+dealer@/i];
const MAYBE = ['ezra.o.monari@gmail.com', 'ezra.o.monari@students.uonbi.ac.ke'];
const KEEP_ROLES = ['partner', 'developer'];
const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
const DEL = { a: 'no action', r: 'restrict', c: 'cascade', n: 'set null', d: 'set default' };

function kind(u) {
  if (KEEP_ROLES.includes(u.role)) return 'keep';
  if (MAYBE.includes(String(u.email).toLowerCase())) return 'maybe';
  if (TEST.some((re) => re.test(String(u.email)))) return 'test';
  return 'review';
}

async function fks(table) {
  const r = await query(
    `SELECT c.conrelid::regclass::text AS tbl, a.attname AS col, ra.attname AS refcol, c.confdeltype AS del
       FROM pg_constraint c
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
       JOIN pg_attribute ra ON ra.attrelid = c.confrelid AND ra.attnum = c.confkey[1]
      WHERE c.contype = 'f' AND c.confrelid = $1::regclass AND array_length(c.conkey, 1) = 1
      ORDER BY 1, 2`, [table]);
  return r.rows;
}

console.log('=== USERS ===');
const users = (await query('SELECT id::text AS id, email, role, created_at FROM users ORDER BY created_at, email')).rows;
const groups = { keep: [], test: [], maybe: [], review: [] };
for (const u of users) groups[kind(u)].push(u);
for (const k of ['keep', 'test', 'maybe', 'review']) {
  console.log('-- ' + k.toUpperCase() + ' (' + groups[k].length + ')');
  for (const u of groups[k]) console.log('   ' + u.role + ' | ' + u.email);
}

console.log('');
console.log('=== ROWS THAT POINT AT TEST / MAYBE USERS ===');
const testIds = groups.test.map((u) => u.id);
const maybeIds = groups.maybe.map((u) => u.id);
const blockers = [];
for (const f of await fks('users')) {
  try {
    const a = (await query('SELECT count(*)::int AS n FROM ' + f.tbl + ' WHERE ' + q(f.col) + '::text = ANY($1::text[])', [testIds])).rows[0].n;
    const b = (await query('SELECT count(*)::int AS n FROM ' + f.tbl + ' WHERE ' + q(f.col) + '::text = ANY($1::text[])', [maybeIds])).rows[0].n;
    if (a || b) {
      const how = DEL[f.del] || f.del;
      console.log('   ' + f.tbl + '.' + f.col + ' [' + how + ']: test ' + a + ', maybe ' + b);
      if (a && (f.del === 'a' || f.del === 'r')) blockers.push(f.tbl + '.' + f.col);
    }
  } catch (e) { console.log('   ' + f.tbl + '.' + f.col + ': could not count (' + e.message + ')'); }
}
console.log(blockers.length ? 'WOULD BLOCK a user delete (must clear or anonymise first): ' + blockers.join(', ') : 'Nothing blocks a user delete.');

console.log('');
console.log('=== PH- PLACEHOLDER PRODUCTS ===');
const st = (await query("SELECT status, count(*)::int AS n FROM catalog_items WHERE sku LIKE 'PH-%' GROUP BY status ORDER BY status")).rows;
console.log('   ' + (st.length ? st.map((r) => r.status + ' ' + r.n).join(', ') : 'none'));
for (const f of await fks('catalog_items')) {
  try {
    const n = (await query('SELECT count(*)::int AS n FROM ' + f.tbl + ' WHERE ' + q(f.col) + '::text IN (SELECT ' + q(f.refcol) + "::text FROM catalog_items WHERE sku LIKE 'PH-%')")).rows[0].n;
    if (n) console.log('   ' + f.tbl + '.' + f.col + ' [' + (DEL[f.del] || f.del) + ']: ' + n + ' rows');
  } catch (e) { console.log('   ' + f.tbl + '.' + f.col + ': could not count (' + e.message + ')'); }
}

console.log('');
console.log('=== DEALERS ===');
for (const v of (await query('SELECT code, name, status FROM vendors ORDER BY code')).rows) console.log('   ' + v.code + ' | ' + v.name + ' | ' + v.status);

console.log('');
console.log('Scan finished. Nothing was changed.');
process.exit(0);
