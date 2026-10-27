const fs = require('fs');
const path = require('path');
const p = path.resolve(__dirname, '..', 'routes', 'customerOrders.js');
const raw = fs.readFileSync(p, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
if (s.includes('shop: SHOP_NAMES')) { console.log('Already done'); process.exit(0); }
if (!s.includes("import { SHOP_NAMES }")) { console.log('NOT FOUND: SHOP_NAMES import (run patch-g9 first)'); process.exit(1); }
const a = 'email: body.contactEmail, discountKes }),';
if (s.split(a).length !== 2) { console.log('NOT FOUND or not unique: ' + a); process.exit(1); }
s = s.replace(a, () => "email: body.contactEmail, discountKes, shop: SHOP_NAMES[typeof storefront === 'undefined' ? '' : storefront] }),");
fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('Patched: routes/customerOrders.js');
console.log('PASS');
