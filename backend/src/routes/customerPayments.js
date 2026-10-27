import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { stkReady } from '../mpesa/daraja.js';

// Customer side of payments. A customer can only SAY they paid. Only a partner can confirm it.
export const customerPaymentRoutes = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: 'too_many_attempts', message: 'Too many attempts. Try again later.' } }),
});
const CODE = /^[A-Z0-9]{10}$/;
const ORDER_REF = /^ORD-\d{6}$/;
const kes = (n) => 'KES ' + Number(n).toLocaleString('en-KE');
const THANKS = 'Thank you. The team will check your payment and message you.';
const tillName = () => process.env.MPESA_TILL_NAME || 'EZRA OPANGA MONARI';

async function myOrder(req, ref) {
  if (!ORDER_REF.test(String(ref || ''))) throw new HttpError(404, 'order_not_found', 'Order not found');
  const { rows } = await query('SELECT id, ref, total_kes, status FROM orders WHERE ref = $1 AND customer_id = $2', [ref, req.user.id]);
  if (!rows[0]) throw new HttpError(404, 'order_not_found', 'Order not found');
  return rows[0];
}
async function paidKes(orderId) {
  const { rows } = await query("SELECT COALESCE(sum(amount_kes), 0)::int AS paid FROM order_payments WHERE order_id = $1 AND status = 'confirmed'", [orderId]);
  return rows[0].paid;
}

customerPaymentRoutes.get('/payments/summary', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT o.ref, o.total_kes, o.status,
            COALESCE((SELECT sum(x.amount_kes) FROM order_payments x WHERE x.order_id = o.id AND x.status = 'confirmed'), 0)::int AS paid,
            EXISTS (SELECT 1 FROM order_payments x WHERE x.order_id = o.id AND x.status = 'awaiting') AS waiting
       FROM orders o WHERE o.customer_id = $1 ORDER BY o.created_at DESC LIMIT 50`,
    [req.user.id]
  );
  res.json({
    till: process.env.MPESA_TILL || null,
    tillName: tillName(),
    orders: rows.map((r) => ({ orderRef: r.ref, totalKes: r.total_kes, paidKes: r.paid, dueKes: Math.max(0, r.total_kes - r.paid), waiting: r.waiting, cancelled: r.status === 'cancelled' })),
  });
}));

customerPaymentRoutes.get('/payments/info', asyncHandler(async (req, res) => {
  const o = await myOrder(req, req.query.order);
  const paid = await paidKes(o.id);
  const list = await query('SELECT id, method, status, claimed_amount_kes, amount_kes, created_at FROM order_payments WHERE order_id = $1 ORDER BY id DESC LIMIT 5', [o.id]);
  res.json({
    orderRef: o.ref,
    totalKes: o.total_kes,
    paidKes: paid,
    dueKes: Math.max(0, o.total_kes - paid),
    cancelled: o.status === 'cancelled',
    till: process.env.MPESA_TILL || null,
    tillName: tillName(),
    promptAvailable: stkReady(),
    payments: list.rows.map((p) => ({ id: String(p.id), method: p.method, status: p.status, amountKes: p.amount_kes || p.claimed_amount_kes, createdAt: p.created_at })),
  });
}));

const claimSchema = z.object({
  orderRef: z.string().trim().max(20),
  message: z.string().trim().max(600).optional(),
  amountKes: z.number().int().min(1).max(10000000).optional(),
});
const manySchema = z.object({ orderRefs: z.array(z.string().trim().max(20)).min(1).max(30) });

function readMessage(text) {
  const up = String(text || '').toUpperCase();
  const a = up.match(/\b([A-Z0-9]{10})\s+CONFIRMED/) || up.match(/^\s*([A-Z0-9]{10})\s*$/);
  const m = up.match(/KSH\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)/);
  const amount = m ? Math.round(parseFloat(m[1].replace(/,/g, ''))) : null;
  return { code: a && CODE.test(a[1]) ? a[1] : null, amount: amount && amount > 0 ? amount : null };
}

// One claim for one order. Throws HttpError when it cannot be made.
async function claimCore(req, p) {
  const o = await myOrder(req, p.orderRef);
  if (o.status === 'cancelled') throw new HttpError(409, 'order_cancelled', 'This order is cancelled');
  const paid = await paidKes(o.id);
  const due = o.total_kes - paid;
  if (due <= 0) throw new HttpError(409, 'already_paid', 'This order is already fully paid');

  let code = null;
  let amount = p.amountKes || null;
  if (p.message && p.message.length >= 10) {
    const rd = readMessage(p.message);
    if (!rd.code) throw new HttpError(400, 'no_code', 'We could not find the M-Pesa code in that message.');
    code = rd.code;
    amount = amount || rd.amount;
  }
  if (!amount) amount = due;
  if (amount > due) throw new HttpError(400, 'amount_too_big', 'The amount is more than the ' + kes(due) + ' still due');

  if (code) {
    const dup = await query("SELECT 1 FROM order_payments WHERE order_id = $2 AND (claimed_code = $1 OR mpesa_code = $1) AND status <> 'rejected' LIMIT 1", [code, o.id]);
    if (dup.rows[0]) throw new HttpError(409, 'code_used', 'That code was already submitted for this order.');
  } else {
    const same = await query("SELECT id FROM order_payments WHERE order_id = $1 AND status = 'awaiting' AND claimed_code IS NULL LIMIT 1", [o.id]);
    if (same.rows[0]) {
      if (p.batchId) await query('UPDATE order_payments SET batch_id = $2 WHERE id = $1 AND batch_id IS NULL', [same.rows[0].id, p.batchId]);
      return { id: String(same.rows[0].id), created: false };
    }
  }
  const wait = await query("SELECT count(*)::int AS n FROM order_payments WHERE order_id = $1 AND status = 'awaiting'", [o.id]);
  if (wait.rows[0].n >= 3) throw new HttpError(409, 'too_many_waiting', 'You already have payments waiting to be checked for this order.');

  const ins = await query(
    "INSERT INTO order_payments (order_id, method, status, claimed_code, claimed_amount_kes, created_by, batch_id) VALUES ($1, 'till_manual', 'awaiting', $2, $3, $4, $5) RETURNING id",
    [o.id, code, amount, req.user.id, p.batchId || null]
  );
  await audit(req, { action: 'payment.claimed', entityType: 'order', entityId: String(o.id), actorUserId: req.user.id, details: { orderRef: o.ref, amountKes: amount, code } });
  return { id: String(ins.rows[0].id), created: true };
}

customerPaymentRoutes.post('/payments/claim', limiter, asyncHandler(async (req, res) => {
  const p = parse(claimSchema, req.body);
  const r = await claimCore(req, p);
  res.status(r.created ? 201 : 200).json({ id: r.id, status: 'awaiting', message: THANKS });
}));

// Pay many orders with one M-Pesa payment: one code-less claim per order.
customerPaymentRoutes.post('/payments/claim-many', limiter, asyncHandler(async (req, res) => {
  const b = parse(manySchema, req.body);
  const results = [];
  const batchId = b.orderRefs.length > 1 ? randomUUID() : null;
  for (const ref of [...new Set(b.orderRefs)]) {
    try {
      const r = await claimCore(req, { orderRef: ref, batchId });
      results.push({ orderRef: ref, ok: true, id: r.id });
    } catch (e) {
      results.push({ orderRef: ref, ok: false, error: e instanceof HttpError ? e.message : 'Could not send this one' });
    }
  }
  const okCount = results.filter((x) => x.ok).length;
  res.json({ results, okCount, message: 'Thank you. We have noted your payment for ' + okCount + ' order' + (okCount === 1 ? '' : 's') + ' and will message you.' });
}));
