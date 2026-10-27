const fs = require('fs');
const path = require('path');
const p = path.resolve(__dirname, '..', 'routes', 'partnerPayments.js');
const raw = fs.readFileSync(p, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
if (s.includes('SHOP_NAMES')) { console.log('Already done'); process.exit(0); }
const edits = [
  ["import { sendEmail } from '../mail.js';", "import { sendEmail } from '../mail.js';\nimport { SHOP_NAMES } from '../delivery.js';"],
  ["const first = String(o.contact_name).trim().split(/\\s+/)[0];", "const first = String(o.contact_name).trim().split(/\\s+/)[0];\n  const shop = SHOP_NAMES[o.storefront_code] || 'Pyfon Brands';"],
  ["Thank you for choosing Pyfon Brands.'", "Thank you for choosing ' + shop + '.'"],
  ["<h2>Pyfon Brands</h2>", "<h2>' + esc(shop) + '</h2>"],
  ["subject: 'Payment received for order ' + o.ref, text: body, html }", "subject: 'Payment received for order ' + o.ref, text: body, html, fromName: shop }"],
];
let miss = false;
for (const [a] of edits) { if (!s.includes(a)) { console.log('NOT FOUND: ' + a); miss = true; } }
if (miss) { console.log('Nothing was written.'); process.exit(1); }
for (const [a, b] of edits) s = s.replace(a, () => b);
fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('Patched: routes/partnerPayments.js');
console.log('PASS');
