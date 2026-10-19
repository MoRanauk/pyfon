import fs from 'node:fs';
import { query } from '../db/pool.js';
const f = 'src/routes/partnerInflow.js';
const sql = fs.readFileSync('src/scripts/customers-query.sql', 'utf8').trim();
try { await query('SELECT o.id FROM orders o LEFT JOIN users u ON u.id = o.customer_id LIMIT 1'); await query('SELECT q.id FROM quote_requests q LEFT JOIN users u ON u.id = q.customer_id LIMIT 1'); await query(sql); }
catch (e) { console.log('FAIL: query does not run: ' + e.message); process.exit(1); }
let t = fs.readFileSync(f, 'utf8');
if (t.includes('COALESCE(o.contact_email, u.email)')) { console.log('Already done'); process.exit(0); }
const i = t.indexOf("partnerInflowRoutes.get('/customers'");
if (i < 0) { console.log('NOT FOUND'); process.exit(1); }
const route = "partnerInflowRoutes.get('/customers', asyncHandler(async (req, res) => {\n  const { rows } = await query(`\n" + sql + "`);\n  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));\n  res.json({ customers: rows.slice(0, 100) });\n}));\n";
fs.writeFileSync(f, t.slice(0, i) + route);
console.log('Patched');
process.exit(0);
