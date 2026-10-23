import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { buildStages } from '../jobs/tracking.js';
import { findDelivery } from '../delivery.js';

// Public order tracking: order number + phone. Shows status only (no address, prices or names).
export const publicTrackRoutes = Router();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false });
const SHOPS = ['mco', 'prestige', 'trim'];
const schema = z.object({
  ref: z.string().trim().max(20).regex(/^ORD-\d+$/i, 'Enter the order number, like ORD-000123'),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{9,18}$/, 'Enter the phone number you used for the order'),
});
const last9 = (s) => String(s || '').replace(/\D/g, '').slice(-9);
const notFound = () => new HttpError(404, 'not_found', 'We could not find an order with those details. Check the number and the phone you used.');

publicTrackRoutes.post('/', limiter, asyncHandler(async (req, res) => {
  if (!SHOPS.includes(req.interfaceCode)) throw new HttpError(400, 'bad_request', 'Unknown shop');
  const body = parse(schema, req.body);
  const ref = body.ref.toUpperCase();
  const want = last9(body.phone);
  if (want.length < 9) throw notFound();

  const o = await query(
    `SELECT o.id, o.ref, o.contact_phone, o.created_at, o.delivery_method,
            j.id AS job_id, j.status AS job_status, j.completed_at
       FROM orders o LEFT JOIN jobs j ON j.order_id = o.id
      WHERE o.ref = $1 AND o.storefront_code = $2`,
    [ref, req.interfaceCode]
  );
  const r = o.rows[0];
  if (!r || last9(r.contact_phone) !== want) throw notFound();

  const delivery = (findDelivery(r.delivery_method) || {}).label || r.delivery_method;
  let tracking = null;
  if (r.job_id && r.job_status !== 'cancelled') {
    const st = await query('SELECT step, status, signed_off_at FROM job_steps WHERE job_id = $1', [r.job_id]);
    const steps = {};
    for (const s of st.rows) steps[s.step] = { status: s.status, signedOffAt: s.signed_off_at };
    const rd = await query(
      `SELECT min(signed_at) AS at FROM job_signatures
        WHERE job_id = $1 AND step = 'finance_delivery' AND role = 'owner' AND voided_at IS NULL`,
      [r.job_id]
    );
    tracking = buildStages({
      createdAt: r.created_at, deliveryMethod: r.delivery_method, jobStatus: r.job_status,
      steps, readyAt: (rd.rows[0] && rd.rows[0].at) || null, completedAt: r.completed_at || null,
    });
  }
  res.set('Cache-Control', 'no-store');
  res.json({ order: { ref: r.ref, createdAt: r.created_at, delivery, cancelled: r.job_status === 'cancelled', tracking } });
}));
