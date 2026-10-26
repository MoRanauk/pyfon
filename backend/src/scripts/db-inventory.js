import { query } from '../db/pool.js';
const out = [];
async function safe(label, sql) {
  try {
    const r = await query(sql);
    out.push('--- ' + label);
    r.rows.forEach((x) => out.push(Object.values(x).join(' | ')));
  } catch (e) { out.push('--- ' + label + ' ERROR ' + e.message); }
}
await safe('tables and row counts', "SELECT table_name, (xpath('/row/c/text()', query_to_xml('SELECT count(*) AS c FROM public.\"' || table_name || '\"', false, true, '')))[1]::text AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name");
await safe('foreign keys (child | parent | on delete)', "SELECT conrelid::regclass::text, confrelid::regclass::text, CASE confdeltype WHEN 'c' THEN 'cascade' WHEN 'n' THEN 'set null' WHEN 'r' THEN 'restrict' ELSE 'no action' END FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace ORDER BY 1, 2");
await safe('users', 'SELECT email, role FROM users ORDER BY role, email');
await safe('items by sku prefix and status', 'SELECT left(sku, 3), status, count(*) FROM items GROUP BY 1, 2 ORDER BY 1, 2');
await safe('items that look like tests', "SELECT sku, name FROM items WHERE name ILIKE '%test%' OR sku ILIKE 'ZZ%' LIMIT 40");
console.log(out.join('\n'));
process.exit(0);
