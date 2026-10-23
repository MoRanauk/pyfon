import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { checkCoupon } from '../coupons.js';

// Customer preview only. The real check runs again when the order is placed.
export const customerCouponRoutes = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const schema = z.object({ code: z.string().trim().min(1).max(30), itemsKes: z.number().int().min(0).max(100000000) });

customerCouponRoutes.post('/coupons/check', limiter, asyncHandler(async (req, res) => {
  const b = parse(schema, req.body);
  const c = await checkCoupon({ query }, b.code, req.interfaceCode, req.user.id, b.itemsKes, false);
  res.json({ code: c.code, kind: c.kind, discountKes: c.discountKes });
}));
