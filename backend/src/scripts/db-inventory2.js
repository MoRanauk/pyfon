import { query } from '../db/pool.js';
const out = [];
async function safe(label, sql) {
  try { const r = await query(sql); out.push('--- ' + label); r.rows.forEach((x) => out.push(Object.values(x).join(' | '))); } catch (e) { out.push('--- ' + label + ' ERROR ' + e.message); }
}
await safe('products by sku prefix and status', 'SELECT left(sku, 3), status, count(*) FROM catalog_items GROUP BY 1, 2 ORDER BY 1, 2');
await safe('products that look like tests', "SELECT sku, name FROM catalog_items WHERE name ILIKE '%test%' OR sku ILIKE 'ZZ%' LIMIT 40");
await safe('users and their order counts', 'SELECT u.email, u.role, u.created_at::date, (SELECT count(*) FROM orders o WHERE o.customer_id = u.id) FROM users u ORDER BY u.role, u.email');
await safe('dealers', 'SELECT code, name, status FROM vendors');
console.log(out.join('\n'));
process.exit(0);
