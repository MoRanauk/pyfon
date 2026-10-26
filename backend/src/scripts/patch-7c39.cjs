const fs = require('fs');
const path = require('path');
const base = path.resolve(__dirname, '..', 'routes');

const customer = [
  ["import { z } from 'zod';", "import { z } from 'zod';\nimport { randomUUID } from 'node:crypto';"],
  ["if (same.rows[0]) return { id: String(same.rows[0].id), created: false };", "if (same.rows[0]) {\n      if (p.batchId) await query('UPDATE order_payments SET batch_id = $2 WHERE id = $1 AND batch_id IS NULL', [same.rows[0].id, p.batchId]);\n      return { id: String(same.rows[0].id), created: false };\n    }"],
  ["claimed_amount_kes, created_by) VALUES ($1, 'till_manual', 'awaiting', $2, $3, $4) RETURNING id", "claimed_amount_kes, created_by, batch_id) VALUES ($1, 'till_manual', 'awaiting', $2, $3, $4, $5) RETURNING id"],
  ["[o.id, code, amount, req.user.id]", "[o.id, code, amount, req.user.id, p.batchId || null]"],
  ["const results = [];", "const results = [];\n  const batchId = b.orderRefs.length > 1 ? randomUUID() : null;"],
  ["claimCore(req, { orderRef: ref })", "claimCore(req, { orderRef: ref, batchId })"],
];
const partner = [
  ["SELECT p.id, p.method, p.status,", "SELECT p.id, p.batch_id, p.method, p.status,"],
  ["jobRef: r.job_ref, handledBy: r.handled_by_name,", "jobRef: r.job_ref, handledBy: r.handled_by_name, batchId: r.batch_id || null,"],
  ["'SELECT order_id FROM order_payments WHERE id = $1'", "'SELECT order_id, batch_id FROM order_payments WHERE id = $1'"],
  ["if (!first.rows[0]) throw new HttpError(404, 'payment_not_found', 'Payment not found');", "if (!first.rows[0]) throw new HttpError(404, 'payment_not_found', 'Payment not found');\n  if (first.rows[0].batch_id) throw new HttpError(409, 'in_group', 'This payment is part of a group. Confirm or reject the whole group.');"],
  ["AND status = 'awaiting' RETURNING order_id", "AND status = 'awaiting' AND batch_id IS NULL RETURNING order_id"],
];
const tail = "\nimport { addGroupRoutes } from './partnerPaymentGroups.js';\naddGroupRoutes(partnerPaymentRoutes, { settle, lockOrder, limiter });\n";

function prep(file, mark, edits, append) {
  const p = path.join(base, file);
  const raw = fs.readFileSync(p, 'utf8');
  const crlf = raw.includes('\r\n');
  let s = raw.replace(/\r\n/g, '\n');
  if (s.includes(mark)) { console.log(file + ': Already done'); return { skip: true }; }
  for (const [a, b] of edits) {
    if (!s.includes(a)) { console.log(file + ': NOT FOUND: ' + a.slice(0, 70)); return null; }
    s = s.replace(a, () => b);
  }
  if (append) s += append;
  if (crlf) s = s.replace(/\n/g, '\r\n');
  return { p, s };
}

const a = prep('customerPayments.js', 'randomUUID', customer, '');
const b = prep('partnerPayments.js', 'partnerPaymentGroups', partner, tail);
if (!a || !b) { console.log('Nothing written.'); process.exit(1); }
if (!a.skip) { fs.writeFileSync(a.p, a.s); console.log('customerPayments.js: Patched'); }
if (!b.skip) { fs.writeFileSync(b.p, b.s); console.log('partnerPayments.js: Patched'); }
