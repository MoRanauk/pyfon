import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';

// Public. A customer who forgot their password asks the team for help.
// The answer is ALWAYS the same, so nobody can find out which emails have accounts.
export const publicPasswordHelpRoutes = Router();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const SHOPS = ['mco', 'prestige', 'trim'];
const schema = z.object({ email: z.string().trim().email().max(150) });
const SAME = { ok: true, message: 'Thank you. If that email has an account, our team has been told and will contact you with a temporary password.' };

publicPasswordHelpRoutes.post('/', limiter, asyncHandler(async (req, res) => {
  if (!SHOPS.includes(req.interfaceCode)) throw new HttpError(400, 'bad_request', 'Unknown shop');
  const body = parse(schema, req.body);
  const u = await query("SELECT id, email FROM users WHERE lower(email) = lower($1) AND role = 'customer' AND is_active", [body.email]);
  const user = u.rows[0];
  if (user) {
    const open = await query(
      "SELECT 1 FROM customer_password_help WHERE user_id = $1 AND status = 'open' AND created_at > now() - interval '1 hour'",
      [user.id]
    );
    if (!open.rows.length) {
      const ins = await query('INSERT INTO customer_password_help (user_id, email, shop) VALUES ($1, $2, $3) RETURNING id', [user.id, user.email, req.interfaceCode]);
      await audit(req, { action: 'password_help.requested', entityType: 'user', entityId: String(user.id), actorUserId: null, details: { shop: req.interfaceCode, requestId: String(ins.rows[0].id) } }).catch(() => {});
    }
  }
  res.set('Cache-Control', 'no-store');
  res.json(SAME);
}));
