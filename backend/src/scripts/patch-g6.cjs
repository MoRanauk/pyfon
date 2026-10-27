const fs = require('fs');
const path = require('path');
const src = path.resolve(__dirname, '..');
const jobs = [];
function load(rel) {
  const p = path.join(src, rel);
  const raw = fs.readFileSync(p, 'utf8');
  return { p, crlf: raw.includes('\r\n'), s: raw.replace(/\r\n/g, '\n') };
}
let miss = false;
function need(ok, msg) { if (!ok) { console.log('NOT FOUND: ' + msg); miss = true; } }

const g = load('routes/groups.js');
if (g.s.includes('customerStkRoutes')) console.log('Already done: groups.js');
else {
  const a = "import { customerPaymentRoutes } from './customerPayments.js';";
  const b = 'customerRoutes.use(customerPaymentRoutes);';
  need(g.s.includes(a) && g.s.includes(b), 'groups.js lines');
  if (!miss) { g.s = g.s.replace(a, () => a + "\nimport { customerStkRoutes } from './customerStk.js';").replace(b, () => b + '\ncustomerRoutes.use(customerStkRoutes);'); jobs.push(g); }
}
const c = load('routes/customerPayments.js');
if (c.s.includes('stkReady')) console.log('Already done: customerPayments.js');
else {
  const a = "import { audit } from '../audit.js';";
  const b = 'promptAvailable: false,';
  need(c.s.includes(a) && c.s.includes(b), 'customerPayments.js lines');
  if (!miss) { c.s = c.s.replace(a, () => a + "\nimport { stkReady } from '../mpesa/daraja.js';").replace(b, () => 'promptAvailable: stkReady(),'); jobs.push(c); }
}
const ap = load('app.js');
if (ap.s.includes('mpesaCallbackRoutes')) console.log('Already done: app.js');
else {
  const m = ap.s.match(/^([ \t]*)(\w+)\.use\(\s*['"]\/v1\/social['"]/m);
  need(m, "app.js line with '/v1/social'");
  if (!miss) {
    ap.s = ap.s.replace(/^import /m, () => "import { mpesaCallbackRoutes } from './routes/mpesaCallback.js';\nimport ");
    ap.s = ap.s.replace(/^([ \t]*)(\w+)\.use\(\s*['"]\/v1\/social['"]/m, (all, ind, name) => ind + name + ".use('/v1/mpesa', mpesaCallbackRoutes);\n" + all);
    jobs.push(ap);
  }
}
if (miss) { console.log('Nothing was written.'); process.exit(1); }
for (const j of jobs) { fs.writeFileSync(j.p, j.crlf ? j.s.replace(/\n/g, '\r\n') : j.s); console.log('Patched: ' + path.relative(src, j.p)); }
console.log('PASS');
