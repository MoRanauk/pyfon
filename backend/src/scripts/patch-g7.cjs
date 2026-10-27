const fs = require('fs');
const path = require('path');
const src = path.resolve(__dirname, '..');
const jobs = [];
let miss = false;
function load(rel) {
  const p = path.join(src, rel);
  const raw = fs.readFileSync(p, 'utf8');
  return { p, crlf: raw.includes('\r\n'), s: raw.replace(/\r\n/g, '\n') };
}
const pp = load('routes/partnerPayments.js');
if (pp.s.includes('export async function settle(')) console.log('Already done: partnerPayments.js');
else {
  const pairs = [
    ['async function lockOrder(client, orderId) {', 'export async function lockOrder(client, orderId) {'],
    ['async function settle(client, o, paymentId, mpesaCode, amountKes, userId) {', 'export async function settle(client, o, paymentId, mpesaCode, amountKes, userId) {'],
    ['async function tell(o, got, r) {', 'export async function tell(o, got, r) {'],
  ];
  for (const [a, b] of pairs) {
    if (!pp.s.includes(a)) { console.log('NOT FOUND: ' + a); miss = true; } else pp.s = pp.s.replace(a, () => b);
  }
  if (!miss) jobs.push(pp);
}
const cs = load('routes/customerStk.js');
if (cs.s.includes("state: 'confirmed'")) console.log('Already done: customerStk.js');
else {
  const a = "SELECT r.result_code FROM mpesa_stk_requests r";
  const b = "if (row.result_code === 0) return res.json({ state: 'received', message: 'Payment received. The team will confirm it shortly.' });";
  if (!cs.s.includes(a) || !cs.s.includes(b)) { console.log('NOT FOUND: customerStk.js lines'); miss = true; }
  else {
    cs.s = cs.s.replace(a, () => 'SELECT r.result_code, p.status AS pay_status FROM mpesa_stk_requests r')
      .replace(b, () => "if (row.result_code === 0 && row.pay_status === 'confirmed') return res.json({ state: 'confirmed', message: 'Payment confirmed. Thank you.' });\n  if (row.result_code === 0) return res.json({ state: 'received', message: 'Payment received. The team will confirm it shortly.' });");
    jobs.push(cs);
  }
}
if (miss) { console.log('Nothing was written.'); process.exit(1); }
for (const j of jobs) { fs.writeFileSync(j.p, j.crlf ? j.s.replace(/\n/g, '\r\n') : j.s); console.log('Patched: ' + path.relative(src, j.p)); }
console.log('PASS');
