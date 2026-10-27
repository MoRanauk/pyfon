const fs = require('fs');
const path = require('path');
const src = path.resolve(__dirname, '..');
const IMPORT = "import { SHOP_NAMES } from '../delivery.js';";
const jobs = [];
let miss = false;
function load(rel) {
  const p = path.join(src, rel);
  const raw = fs.readFileSync(p, 'utf8');
  return { rel, p, crlf: raw.includes('\r\n'), s: raw.replace(/\r\n/g, '\n') };
}
function apply(rel, pairs) {
  const f = load(rel);
  if (f.s.includes('SHOP_NAMES')) { console.log('Already done: ' + rel); return; }
  let ok = true;
  for (const [a] of pairs) {
    const n = f.s.split(a).length - 1;
    if (n !== 1) { console.log('NOT FOUND or not unique (' + n + ') in ' + rel + ': ' + a.slice(0, 70)); ok = false; }
  }
  if (!ok) { miss = true; return; }
  for (const [a, b] of pairs) f.s = f.s.replace(a, () => b);
  f.s = f.s.replace(/^import /m, () => IMPORT + '\nimport ');
  jobs.push(f);
}

apply('routes/customerOrders.js', [
  [`function orderText({ name, ref, itemsKes, totalKes, delivery, email, discountKes }) {`, `function orderText({ name, ref, itemsKes, totalKes, delivery, email, discountKes, shop }) {`],
  [`thank you for ordering with Pyfon Brands. Your order `, `thank you for ordering with ' + (shop || 'Pyfon Brands') + '. Your order `],
  [`Thank you for choosing Pyfon Brands.';`, `Thank you for choosing ' + (shop || 'Pyfon Brands') + '.';`],
  [`, Pyfon Brands has received your quote request `, `, ' + (SHOP_NAMES[storefront] || 'Pyfon Brands') + ' has received your quote request `],
]);
apply('routes/partnerPaymentGroups.js', [
  [`const o = items[0].o;`, `const o = items[0].o;\n  const shop = SHOP_NAMES[o.storefront_code] || 'Pyfon Brands';`],
  [`'Thank you for choosing Pyfon Brands.';`, `'Thank you for choosing ' + shop + '.';`],
  [`<h2>Pyfon Brands</h2>`, `<h2>' + esc(shop) + '</h2>`],
  [`subject: 'Payment received for ' + items.length + ' orders', text: body, html }`, `subject: 'Payment received for ' + items.length + ' orders', text: body, html, fromName: shop }`],
]);
apply('routes/partnerInvoices.js', [
  [`const rows = r.lines.map(`, `let shop = 'Pyfon Brands';\n  try {\n    const sc = await pool.query('SELECT COALESCE(o.storefront_code, q.storefront_code) AS sc FROM jobs j LEFT JOIN orders o ON o.id = j.order_id LEFT JOIN quote_requests q ON q.id = j.quote_request_id WHERE j.ref = $1', [r.job_ref]);\n    if (sc.rows[0] && SHOP_NAMES[sc.rows[0].sc]) shop = SHOP_NAMES[sc.rows[0].sc];\n  } catch (e) { console.warn('invoice shop lookup skipped: ' + e.message); }\n  const rows = r.lines.map(`],
  [`<h2 style="margin-bottom:0">Pyfon Brands</h2>`, `<h2 style="margin-bottom:0">' + esc(shop) + '</h2>`],
  [`Thank you, Pyfon Brands.';`, `Thank you, ' + shop + '.';`],
  [`' from Pyfon Brands', text, html });`, `' from ' + shop, text, html, fromName: shop });`],
]);
if (miss) { console.log('Nothing was written.'); process.exit(1); }
for (const j of jobs) { fs.writeFileSync(j.p, j.crlf ? j.s.replace(/\n/g, '\r\n') : j.s); console.log('Patched: ' + j.rel); }
console.log('PASS');
