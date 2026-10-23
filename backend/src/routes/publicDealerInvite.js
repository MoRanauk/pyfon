import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { withTransaction } from '../db/tx.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { hashPassword } from '../auth/password.js';

// Public. An accepted dealer opens the emailed link and creates their account. Tokens work once.
const router = Router();
const tooMany = (req, res) =>
  res.status(429).json({ error: { code: 'too_many_attempts', message: 'Too many attempts. Try again later.' } });
const checkLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, handler: tooMany });
const acceptLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, handler: tooMany });

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const tokenSchema = z.object({ token: z.string().min(20).max(100) });
const acceptSchema = tokenSchema.extend({ full_name: z.string().trim().min(2).max(100), password: z.string().min(10).max(128) });
const bad = () => new HttpError(400, 'invalid_invite', 'This invitation link is not valid any more. Ask the Pyfon team for a new one.');
function onlyVendor(req) {
  if (req.interfaceCode !== 'vendor') throw new HttpError(403, 'not_allowed_here', 'Open the link in the dealer portal');
}

router.post('/check', checkLimiter, asyncHandler(async (req, res) => {
  onlyVendor(req);
  const { token } = parse(tokenSchema, req.body);
  const { rows } = await query(
    `SELECT a.name, i.email FROM application_invites i JOIN seller_applications a ON a.id = i.application_id
      WHERE i.token_hash = $1 AND i.used_at IS NULL AND i.expires_at > now()`,
    [sha(token)]
  );
  if (!rows[0]) throw bad();
  res.json({ ok: true, name: rows[0].name, email: rows[0].email });
}));

router.post('/accept', acceptLimiter, asyncHandler(async (req, res) => {
  onlyVendor(req);
  const b = parse(acceptSchema, req.body);
  const hash = await hashPassword(b.password);
  let out;
  try {
    out = await withTransaction(async (client) => {
      const r = await client.query(
        `SELECT i.id, i.vendor_code, i.email FROM application_invites i
          WHERE i.token_hash = $1 AND i.used_at IS NULL AND i.expires_at > now() FOR UPDATE OF i`,
        [sha(b.token)]
      );
      const inv = r.rows[0];
      if (!inv) throw bad();
      const u = await client.query(
        "INSERT INTO users (email, password_hash, full_name, role, vendor_code, must_change_password) VALUES ($1, $2, $3, 'vendor', $4, false) RETURNING id",
        [String(inv.email).toLowerCase(), hash, b.full_name, inv.vendor_code]
      );
      await client.query("UPDATE vendors SET status = 'active' WHERE code = $1", [inv.vendor_code]);
      await client.query('UPDATE application_invites SET used_at = now() WHERE id = $1', [inv.id]);
      return { userId: String(u.rows[0].id), code: inv.vendor_code };
    });
  } catch (err) {
    if (err && err.code === '23505') throw new HttpError(409, 'email_taken', 'An account with this email already exists. Ask the Pyfon team for help.');
    throw err;
  }
  await audit(req, { action: 'vendor.joined', entityType: 'user', entityId: out.userId, actorUserId: out.userId, details: { dealer: out.code } });
  res.status(201).json({ ok: true });
}));

export const publicDealerInviteRoutes = router;
export default router;
