import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const jobs = [
  { file: 'backend/src/routes/partnerCoupons.js', edits: [
    ['cap check', "v.value <= 50", "v.value <= 15"],
    ['cap message', "50% at most", "15% at most"],
  ] },
  { file: 'backend/src/coupons.js', edits: [
    ['cap calc', "Math.floor((itemsKes * c.value_num) / 100)", "Math.floor((itemsKes * Math.min(c.value_num, 15)) / 100)"],
  ] },
  { file: 'backend/src/routes/customerOrders.js', edits: [
    ['text args', "function orderText({ name, ref, itemsKes, totalKes, delivery, email }) {", "function orderText({ name, ref, itemsKes, totalKes, delivery, email, discountKes }) {"],
    ['text line', "kes(itemsKes) + '. ' + del", "kes(itemsKes) + '. ' + (discountKes ? 'Coupon discount: -' + kes(discountKes) + '. ' : '') + del"],
    ['text call', "orderText({ name: body.contactName, ref: order.ref, itemsKes, totalKes, delivery, email: body.contactEmail })", "orderText({ name: body.contactName, ref: order.ref, itemsKes, totalKes, delivery, email: body.contactEmail, discountKes })"],
  ] },
];
let miss = false;
const pending = [];
for (const j of jobs) {
  const full = path.join(root, j.file);
  const raw = fs.readFileSync(full, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let t = raw.replace(/\r\n/g, '\n');
  let changed = false;
  for (const [name, from, to] of j.edits) {
    if (t.includes(to)) { console.log('Already done: ' + j.file + ' / ' + name); continue; }
    if (!t.includes(from)) { console.log('NOT FOUND: ' + j.file + ' / ' + name); miss = true; continue; }
    t = t.replace(from, () => to);
    changed = true;
    console.log('Patched: ' + j.file + ' / ' + name);
  }
  pending.push({ full, t: t.replace(/\n/g, eol), changed });
}
if (miss) { console.log('FAIL: something was not found, nothing was written'); process.exit(1); }
for (const p of pending) if (p.changed) fs.writeFileSync(p.full, p.t, 'utf8');
console.log('PASS');
