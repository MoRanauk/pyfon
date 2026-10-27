import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { startPrompt } from '../mpesa/stk.js';

// Customer asks for an M-Pesa prompt. Only a partner can confirm the money.
export const customerStkRoutes = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: 'too_many_attempts', message: 'Too many attempts. Try again later.' } }),
});
const ORDER_REF = /^ORD-\d{6}$/;

async function myOrder(req, ref) {
  if (!ORDER_REF.test(String(ref || ''))) throw new HttpError(404, 'order_not_found', 'Order not found');
  const { rows } = await query('SELECT id, ref, total_kes, status FROM orders WHERE ref = $1 AND customer_id = $2', [ref, req.user.id]);
  if (!rows[0]) throw new HttpError(404, 'order_not_found', 'Order not found');
  return rows[0];
}

const schema = z.object({
  orderRef: z.string().trim().max(20),
  phone: z.string().trim().max(20),
  amountKes: z.number().int().min(1).max(10000000).optional(),
});

customerStkRoutes.post('/payments/prompt', limiter, asyncHandler(async (req, res) => {
  const b = parse(schema, req.body);
  const o = await myOrder(req, b.orderRef);
  const r = await startPrompt(o, req.user.id, b.phone, b.amountKes);
  await audit(req, { action: 'payment.prompt_sent', entityType: 'order', entityId: String(o.id), actorUserId: req.user.id, details: { orderRef: o.ref, amountKes: r.amountKes } });
  res.status(201).json({ ok: true, message: 'Check your phone and enter your M-Pesa PIN.' });
}));

const WHY = { 1032: 'You cancelled the prompt.', 1: 'Not enough M-Pesa balance.', 2001: 'The PIN was wrong.', 1037: 'The prompt timed out. Try again.' };

customerStkRoutes.get('/payments/prompt-status', asyncHandler(async (req, res) => {
  const o = await myOrder(req, req.query.order);
  const { rows } = await query(
    'SELECT r.result_code, p.status AS pay_status FROM mpesa_stk_requests r JOIN order_payments p ON p.id = r.payment_id WHERE p.order_id = $1 ORDER BY r.id DESC LIMIT 1', [o.id]
  );
  const row = rows[0];
  if (!row) return res.json({ state: 'none' });
  if (row.result_code === null) return res.json({ state: 'pending', message: 'Waiting for you to enter your PIN.' });
  if (row.result_code === 0 && row.pay_status === 'confirmed') return res.json({ state: 'confirmed', message: 'Payment confirmed. Thank you.' });
  if (row.result_code === 0) return res.json({ state: 'received', message: 'Payment received. The team will confirm it shortly.' });
  res.json({ state: 'failed', message: WHY[row.result_code] || 'The payment did not go through.' });
}));
