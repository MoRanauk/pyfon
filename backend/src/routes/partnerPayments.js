import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { withTransaction } from '../db/tx.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { enqueueMessage } from '../messages/queue.js';
import { sendEmail } from '../mail.js';

// Partner side of payments. Confirming writes an income row to the Money book and tells the customer.
export const partnerPaymentRoutes = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: 'too_many_attempts', message: 'Too many attempts. Try again later.' } }),
});
const CODE = /^[A-Z0-9]{4,20}$/;
const ORDER_REF = /^ORD-\d{6}$/;
const code = z.string().trim().max(20).transform((s) => s.toUpperCase()).refine((s) => CODE.test(s), 'Type the M-Pesa code (4 to 20 letters and numbers)');
const amount = z.number().int().min(1).max(10000000);
const kes = (n) => 'KES ' + Number(n).toLocaleString('en-KE');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function lockOrder(client, orderId) {
  const { rows } = await client.query('SELECT id, ref, total_kes, status, contact_name, contact_phone, contact_email, storefront_code FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
  if (!rows[0]) throw new HttpError(404, 'order_not_found', 'Order not found');
  return rows[0];
}

async function settle(client, o, paymentId, mpesaCode, amountKes, userId) {
  if (o.status === 'cancelled') throw new HttpError(409, 'order_cancelled', 'This order is cancelled');
  const s = await client.query("SELECT COALESCE(sum(amount_kes), 0)::int AS paid FROM order_payments WHERE order_id = $1 AND status = 'confirmed'", [o.id]);
  const paid = s.rows[0].paid;
  if (paid + amountKes > o.total_kes) throw new HttpError(409, 'too_much', 'That is more than the order still owes (' + kes(o.total_kes - paid) + ')');
  const clash = await client.query(
    "SELECT 1 FROM order_payments p JOIN orders x ON x.id = p.order_id WHERE p.mpesa_code = $1 AND p.status = 'confirmed' AND p.id <> $3 AND (p.order_id = $2 OR x.customer_id <> (SELECT customer_id FROM orders WHERE id = $2)) LIMIT 1",
    [mpesaCode, o.id, paymentId]
  );
  if (clash.rows[0]) throw new HttpError(409, 'code_used', 'That M-Pesa code is already confirmed on this order or on another customer');
  const j = await client.query('SELECT ref FROM jobs WHERE order_id = $1', [o.id]);
  const jobRef = j.rows[0] ? j.rows[0].ref : null;
  const m = await client.query(
    "INSERT INTO money_entries (entry_date, kind, category, cost_type, amount_kes, job_ref, party, note, created_by) VALUES ((now() AT TIME ZONE 'Africa/Nairobi')::date, 'income', 'Sales', NULL, $1, $2, $3, $4, $5) RETURNING id",
    [amountKes, jobRef, String(o.contact_name).slice(0, 80), 'M-Pesa ' + mpesaCode + ' for ' + o.ref + ' (' + o.storefront_code + ')', userId]
  );
  try {
    await client.query(
      "UPDATE order_payments SET status = 'confirmed', amount_kes = $2, mpesa_code = $3, money_entry_id = $4, handled_by = $5, handled_at = now() WHERE id = $1",
      [paymentId, amountKes, mpesaCode, m.rows[0].id, userId]
    );
  } catch (e) {
    if (e.code === '23505') throw new HttpError(409, 'code_used', 'That M-Pesa code is already confirmed on another payment');
    throw e;
  }
  return { jobRef, paidKes: paid + amountKes, dueKes: o.total_kes - paid - amountKes };
}

// Runs AFTER the money is saved. A failed message never undoes a confirmed payment.
async function tell(o, got, r) {
  const first = String(o.contact_name).trim().split(/\s+/)[0];
  const body = 'Hello ' + first + ', your payment of ' + kes(got) + ' for order ' + o.ref + ' has been received. '
    + (r.dueKes > 0 ? 'Balance still due: ' + kes(r.dueKes) + '. ' : 'Your order is fully paid. ')
    + 'Thank you for choosing Pyfon Brands.';
  let queued = false;
  let emailed = false;
  try { await enqueueMessage({ query }, { kind: 'payment_received', phone: o.contact_phone, orderId: o.id, body }); queued = true; } catch (e) { console.warn('payment message not queued: ' + e.message); }
  if (o.contact_email) {
    try {
      const html = '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0b2a4a"><h2>Pyfon Brands</h2><p>' + esc(body) + '</p>'
        + '<p style="font-size:12px;color:#666">Operated by Pyfon Brands<br>Built and owned by Emlabs &middot; &copy; Emlabs. All rights reserved.</p></div>';
      emailed = Boolean(await sendEmail({ to: o.contact_email, subject: 'Payment received for order ' + o.ref, text: body, html }));
    } catch (e) { console.warn('payment email not sent: ' + e.message); }
  }
  return { queued, emailed };
}

const shapePay = (r) => ({
  id: String(r.id), method: r.method, status: r.status, claimedCode: r.claimed_code, claimedAmountKes: r.claimed_amount_kes,
  amountKes: r.amount_kes, mpesaCode: r.mpesa_code, rejectReason: r.reject_reason, createdAt: r.created_at, handledAt: r.handled_at,
  orderRef: r.order_ref, store: r.store, customer: r.contact_name, phone: r.contact_phone, totalKes: r.total_kes, paidKes: r.paid_kes,
  dueKes: r.total_kes - r.paid_kes, jobRef: r.job_ref, handledBy: r.handled_by_name, batchId: r.batch_id || null,
});
const SEL = `SELECT p.id, p.batch_id, p.method, p.status, p.claimed_code, p.claimed_amount_kes, p.amount_kes, p.mpesa_code, p.reject_reason, p.created_at, p.handled_at,
    o.ref AS order_ref, o.storefront_code AS store, o.contact_name, o.contact_phone, o.total_kes, j.ref AS job_ref,
    (SELECT COALESCE(sum(x.amount_kes), 0)::int FROM order_payments x WHERE x.order_id = o.id AND x.status = 'confirmed') AS paid_kes,
    (SELECT u.full_name FROM users u WHERE u.id = p.handled_by) AS handled_by_name
  FROM order_payments p JOIN orders o ON o.id = p.order_id LEFT JOIN jobs j ON j.order_id = o.id `;

partnerPaymentRoutes.get('/payments', asyncHandler(async (req, res) => {
  const f = parse(z.object({ status: z.enum(['awaiting', 'confirmed', 'rejected']).default('awaiting') }), req.query);
  const { rows } = await query(SEL + 'WHERE p.status = $1 ORDER BY p.id DESC LIMIT 100', [f.status]);
  res.json({ payments: rows.map(shapePay) });
}));

partnerPaymentRoutes.get('/orders/:ref/payments', asyncHandler(async (req, res) => {
  if (!ORDER_REF.test(req.params.ref)) throw new HttpError(404, 'order_not_found', 'Order not found');
  const { rows } = await query(SEL + 'WHERE o.ref = $1 ORDER BY p.id DESC LIMIT 50', [req.params.ref]);
  const o = await query("SELECT total_kes, (SELECT COALESCE(sum(amount_kes), 0)::int FROM order_payments x WHERE x.order_id = orders.id AND x.status = 'confirmed') AS paid FROM orders WHERE ref = $1", [req.params.ref]);
  if (!o.rows[0]) throw new HttpError(404, 'order_not_found', 'Order not found');
  res.json({ totalKes: o.rows[0].total_kes, paidKes: o.rows[0].paid, dueKes: o.rows[0].total_kes - o.rows[0].paid, payments: rows.map(shapePay) });
}));

partnerPaymentRoutes.post('/payments/:id/confirm', limiter, asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!/^\d{1,18}$/.test(id)) throw new HttpError(404, 'payment_not_found', 'Payment not found');
  const b = parse(z.object({ mpesaCode: code, amountKes: amount }), req.body);
  const first = await query('SELECT order_id, batch_id FROM order_payments WHERE id = $1', [id]);
  if (!first.rows[0]) throw new HttpError(404, 'payment_not_found', 'Payment not found');
  if (first.rows[0].batch_id) throw new HttpError(409, 'in_group', 'This payment is part of a group. Confirm or reject the whole group.');
  const out = await withTransaction(async (client) => {
    const o = await lockOrder(client, first.rows[0].order_id);
    const p = await client.query('SELECT id, status FROM order_payments WHERE id = $1 FOR UPDATE', [id]);
    if (!p.rows[0] || p.rows[0].status !== 'awaiting') throw new HttpError(409, 'not_awaiting', 'This payment was already handled');
    const r = await settle(client, o, id, b.mpesaCode, b.amountKes, req.user.id);
    return { o, r };
  });
  await audit(req, { action: 'payment.confirmed', entityType: 'order', entityId: String(out.o.id), actorUserId: req.user.id, details: { orderRef: out.o.ref, jobRef: out.r.jobRef, amountKes: b.amountKes, code: b.mpesaCode } });
  const sent = await tell(out.o, b.amountKes, out.r);
  res.json({ ok: true, paidKes: out.r.paidKes, dueKes: out.r.dueKes, messageQueued: sent.queued, emailed: sent.emailed });
}));

partnerPaymentRoutes.post('/payments/:id/reject', limiter, asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!/^\d{1,18}$/.test(id)) throw new HttpError(404, 'payment_not_found', 'Payment not found');
  const b = parse(z.object({ reason: z.string().trim().min(3).max(300) }), req.body);
  const u = await query("UPDATE order_payments SET status = 'rejected', reject_reason = $2, handled_by = $3, handled_at = now() WHERE id = $1 AND status = 'awaiting' AND batch_id IS NULL RETURNING order_id", [id, b.reason, req.user.id]);
  if (!u.rows[0]) throw new HttpError(409, 'not_awaiting', 'This payment was already handled or does not exist');
  await audit(req, { action: 'payment.rejected', entityType: 'order', entityId: String(u.rows[0].order_id), actorUserId: req.user.id, details: { paymentId: id, reason: b.reason } });
  res.json({ ok: true });
}));

// For a customer who paid in person or without using the site: Finance records it directly.
partnerPaymentRoutes.post('/orders/:ref/payments/record', limiter, asyncHandler(async (req, res) => {
  if (!ORDER_REF.test(req.params.ref)) throw new HttpError(404, 'order_not_found', 'Order not found');
  const b = parse(z.object({ mpesaCode: code, amountKes: amount }), req.body);
  const f = await query('SELECT id FROM orders WHERE ref = $1', [req.params.ref]);
  if (!f.rows[0]) throw new HttpError(404, 'order_not_found', 'Order not found');
  const out = await withTransaction(async (client) => {
    const o = await lockOrder(client, f.rows[0].id);
    const ins = await client.query(
      "INSERT INTO order_payments (order_id, method, status, claimed_code, claimed_amount_kes, created_by) VALUES ($1, 'recorded', 'awaiting', $2, $3, $4) RETURNING id",
      [o.id, b.mpesaCode, b.amountKes, req.user.id]
    );
    const r = await settle(client, o, ins.rows[0].id, b.mpesaCode, b.amountKes, req.user.id);
    return { o, r };
  });
  await audit(req, { action: 'payment.recorded', entityType: 'order', entityId: String(out.o.id), actorUserId: req.user.id, details: { orderRef: out.o.ref, jobRef: out.r.jobRef, amountKes: b.amountKes, code: b.mpesaCode } });
  const sent = await tell(out.o, b.amountKes, out.r);
  res.status(201).json({ ok: true, paidKes: out.r.paidKes, dueKes: out.r.dueKes, messageQueued: sent.queued, emailed: sent.emailed });
}));

import { addGroupRoutes } from './partnerPaymentGroups.js';
addGroupRoutes(partnerPaymentRoutes, { settle, lockOrder, limiter });
