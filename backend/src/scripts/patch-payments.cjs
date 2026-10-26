const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
let bad = 0;
function patch(rel, pairs) {
  const f = path.join(root, rel);
  if (!fs.existsSync(f)) { console.log('NOT FOUND file: ' + rel); bad++; return; }
  const raw = fs.readFileSync(f, 'utf8');
  const crlf = raw.includes('\r\n');
  let t = raw.replace(/\r\n/g, '\n');
  let changed = false;
  for (const [name, test, find, put] of pairs) {
    if (t.includes(test)) { console.log('Already done: ' + rel + ' ' + name); continue; }
    const ok = typeof find === 'string' ? t.includes(find) : find.test(t);
    if (!ok) { console.log('NOT FOUND: ' + rel + ' ' + name); bad++; return; }
    t = t.replace(find, () => put);
    changed = true;
    console.log('Patched: ' + rel + ' ' + name);
  }
  if (changed) fs.writeFileSync(f, crlf ? t.replace(/\n/g, '\r\n') : t);
}

patch('backend/src/routes/groups.js', [
  ['imports', "import { customerPaymentRoutes }", "import { customerCouponRoutes } from './customerCoupons.js';\n", "import { customerCouponRoutes } from './customerCoupons.js';\nimport { customerPaymentRoutes } from './customerPayments.js';\nimport { partnerPaymentRoutes } from './partnerPayments.js';\n"],
  ['customer mount', "customerRoutes.use(customerPaymentRoutes);", "customerRoutes.use(customerCouponRoutes);\n", "customerRoutes.use(customerCouponRoutes);\ncustomerRoutes.use(customerPaymentRoutes);\n"],
  ['partner mount', "partnerRoutes.use(partnerPaymentRoutes);", "partnerRoutes.use('/dealers', partnerDealerRoutes);\n", "partnerRoutes.use('/dealers', partnerDealerRoutes);\npartnerRoutes.use(partnerPaymentRoutes);\n"],
]);

patch('backend/src/routes/customerPayments.js', [
  ['message reader', 'function readMessage', /const claimSchema = z\.object\(\{[\s\S]*?\n\}\);\n/,
   "const claimSchema = z.object({\n  orderRef: z.string().trim().max(20),\n  message: z.string().trim().min(10).max(600),\n  amountKes: z.number().int().min(1).max(10000000).optional(),\n});\n\n// Reads the code and amount from a pasted M-Pesa message, or from a typed 10-character code.\nfunction readMessage(text) {\n  const up = String(text || '').toUpperCase();\n  const a = up.match(/\\b([A-Z0-9]{10})\\s+CONFIRMED/) || up.match(/^\\s*([A-Z0-9]{10})\\s*$/);\n  const m = up.match(/KSH\\s?([0-9][0-9,]*(?:\\.[0-9]{1,2})?)/);\n  const amount = m ? Math.round(parseFloat(m[1].replace(/,/g, ''))) : null;\n  return { code: a && CODE.test(a[1]) ? a[1] : null, amount: amount && amount > 0 ? amount : null };\n}\n"],
  ['use reader', 'readMessage(p.message)', "  const b = parse(claimSchema, req.body);\n",
   "  const p = parse(claimSchema, req.body);\n  const rd = readMessage(p.message);\n  if (!rd.code) throw new HttpError(400, 'no_code', 'We could not find the M-Pesa code. Paste the whole M-Pesa message, or type the 10-character code.');\n  const b = { orderRef: p.orderRef, mpesaCode: rd.code, amountKes: p.amountKes || rd.amount || null };\n"],
  ['default amount', 'if (!b.amountKes) b.amountKes = due;', "  if (due <= 0) throw new HttpError(409, 'already_paid', 'This order is already fully paid');\n",
   "  if (due <= 0) throw new HttpError(409, 'already_paid', 'This order is already fully paid');\n  if (!b.amountKes) b.amountKes = due;\n"],
]);

patch('apps/m3labs/src/App.jsx', [
  ['import', "import Payments from './Payments.jsx';", "import Coupons from './Coupons.jsx';\n", "import Coupons from './Coupons.jsx';\nimport Payments from './Payments.jsx';\n"],
  ['route', '<Payments />', '        <Route path="/coupons" element={<Coupons />} />\n', '        <Route path="/coupons" element={<Coupons />} />\n        <Route path="/payments" element={<Payments />} />\n'],
]);

patch('apps/m3labs/src/partnerNav.js', [
  ['menu', "'/payments'", "['/applications', 'Applications', true],", "['/applications', 'Applications', true], ['/payments', 'Payments', true],"],
]);

patch('apps/gift-hub/src/Orders.jsx', [
  ['import', "import PayPanel", "import './od.css';\n", "import './od.css';\nimport PayPanel from './PayPanel.jsx';\n"],
  ['panel', '<PayPanel', '      <p className="od-total">Total: {kes(o.totalKes)}</p>\n', '      <p className="od-total">Total: {kes(o.totalKes)}</p>\n      <PayPanel orderRef={o.ref} iface={STORE} />\n'],
]);
patch('apps/trim-atelier/src/Orders.jsx', [
  ['import', "import PayPanel", "import './od.css';\n", "import './od.css';\nimport PayPanel from './PayPanel.jsx';\n"],
  ['panel', '<PayPanel', '      <p className="od-total">Total: {kes(o.totalKes)}</p>\n', '      <p className="od-total">Total: {kes(o.totalKes)}</p>\n      <PayPanel orderRef={o.ref} iface={STORE} />\n'],
]);
patch('apps/mco-brands/src/Orders.jsx', [
  ['import', "import PayPanel", "import { API_URL, tokens } from './api.js';\n", "import { API_URL, tokens } from './api.js';\nimport PayPanel from './PayPanel.jsx';\n"],
  ['panel', '<PayPanel', '      <p><strong>Total: {kes(o.totalKes)}</strong></p>\n', '      <p><strong>Total: {kes(o.totalKes)}</strong></p>\n      <PayPanel orderRef={o.ref} iface="mco" />\n'],
]);

if (bad) { console.log('FAIL: ' + bad + ' problem(s)'); process.exit(1); }
console.log('PASS');
