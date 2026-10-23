import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { withTransaction } from '../db/tx.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { normCode } from '../coupons.js';

// Partners only. A coupon needs ALL THREE partners to approve before it works (rule 6).
export const partnerCouponRoutes = Router();
const NEEDED = 3;
const idOk = (s) => /^\d{1,15}$/.test(String(s));

const createSchema = z.object({
  code: z.string().trim().regex(/^[A-Za-z0-9-]{3,20}$/, 'Use 3 to 20 letters, numbers or dashes'),
  kind: z.enum(['percent', 'fixed']),
  value: z.number().int().min(1).max(1000000),
  minOrderKes: z.number().int().min(0).max(100000000).default(0),
  maxUses: z.number().int().min(1).max(1000000).nullable().optional(),
  storefronts: z.array(z.enum(['mco', 'prestige', 'trim'])).max(3).default([]),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
}).refine((v) => v.kind !== 'percent' || v.value <= 15, { message: 'A percentage coupon can be 15% at most', path: ['value'] });

const shape = (r) => ({
  id: String(r.id), code: r.code, kind: r.kind, value: r.value_num, minOrderKes: r.min_order_kes, maxUses: r.max_uses,
  usedCount: r.used_count, storefronts: r.storefronts, startsAt: r.starts_at, endsAt: r.ends_at, status: r.status,
  createdAt: r.created_at, approvals: r.approvals, approvedByMe: r.approved_by_me, needed: NEEDED,
});

partnerCouponRoutes.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT c.*, (SELECT count(*)::int FROM coupon_approvals a WHERE a.coupon_id = c.id) AS approvals,
            EXISTS (SELECT 1 FROM coupon_approvals a WHERE a.coupon_id = c.id AND a.partner_id = $1) AS approved_by_me
       FROM coupons c ORDER BY c.id DESC LIMIT 200`,
    [req.user.id]
  );
  res.json({ coupons: rows.map(shape), needed: NEEDED });
}));

partnerCouponRoutes.post('/', asyncHandler(async (req, res) => {
  const b = parse(createSchema, req.body);
  const code = normCode(b.code);
  let row;
  try {
    row = await withTransaction(async (client) => {
      const c = await client.query(
        `INSERT INTO coupons (code, kind, value_num, min_order_kes, max_uses, storefronts, starts_at, ends_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [code, b.kind, b.value, b.minOrderKes, b.maxUses ?? null, b.storefronts, b.startsAt ?? null, b.endsAt ?? null, req.user.id]
      );
      await client.query('INSERT INTO coupon_approvals (coupon_id, partner_id) VALUES ($1, $2)', [c.rows[0].id, req.user.id]);
      return c.rows[0];
    });
  } catch (e) {
    if (e && e.code === '23505') throw new HttpError(409, 'code_taken', 'That coupon code already exists');
    throw e;
  }
  await audit(req, { action: 'coupon.created', entityType: 'coupon', entityId: String(row.id), actorUserId: req.user.id, details: { code, kind: b.kind, value: b.value } });
  res.status(201).json({ id: String(row.id), status: 'pending' });
}));

partnerCouponRoutes.post('/:id/approve', asyncHandler(async (req, res) => {
  if (!idOk(req.params.id)) throw new HttpError(404, 'not_found', 'Coupon not found');
  const out = await withTransaction(async (client) => {
    const c = await client.query('SELECT id, code, status FROM coupons WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!c.rows.length) throw new HttpError(404, 'not_found', 'Coupon not found');
    if (c.rows[0].status !== 'pending') throw new HttpError(409, 'not_pending', 'This coupon is not waiting for approval');
    await client.query('INSERT INTO coupon_approvals (coupon_id, partner_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.id, req.user.id]);
    const n = await client.query(
      `SELECT count(DISTINCT a.partner_id)::int AS n FROM coupon_approvals a JOIN users u ON u.id = a.partner_id
        WHERE a.coupon_id = $1 AND u.role = 'partner' AND u.is_active`,
      [req.params.id]
    );
    const approvals = n.rows[0].n;
    const active = approvals >= NEEDED;
    if (active) await client.query("UPDATE coupons SET status = 'active' WHERE id = $1", [req.params.id]);
    return { code: c.rows[0].code, approvals, active };
  });
  await audit(req, { action: 'coupon.approved', entityType: 'coupon', entityId: String(req.params.id), actorUserId: req.user.id, details: { code: out.code, approvals: out.approvals } });
  if (out.active) await audit(req, { action: 'coupon.activated', entityType: 'coupon', entityId: String(req.params.id), actorUserId: req.user.id, details: { code: out.code } });
  res.json({ approvals: out.approvals, needed: NEEDED, status: out.active ? 'active' : 'pending' });
}));

partnerCouponRoutes.post('/:id/disable', asyncHandler(async (req, res) => {
  if (!idOk(req.params.id)) throw new HttpError(404, 'not_found', 'Coupon not found');
  const r = await query("UPDATE coupons SET status = 'disabled' WHERE id = $1 AND status <> 'disabled' RETURNING code", [req.params.id]);
  if (!r.rows.length) throw new HttpError(404, 'not_found', 'Coupon not found or already disabled');
  await audit(req, { action: 'coupon.disabled', entityType: 'coupon', entityId: String(req.params.id), actorUserId: req.user.id, details: { code: r.rows[0].code } });
  res.json({ status: 'disabled' });
}));
