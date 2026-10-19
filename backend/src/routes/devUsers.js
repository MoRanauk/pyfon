import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { hashPassword, generateTempPassword } from '../auth/password.js';
import { sendEmail, maskEmail, maskPhone } from '../mail.js';

// Developer desk: see accounts, send temporary passwords, sign people out, hide customers and dealers.
export const devUserRoutes = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: 'too_many_attempts', message: 'Too many changes. Try again later.' } }),
});
const idSchema = z.object({ id: z.string().uuid() });
const listSchema = z.object({
  role: z.enum(['all', 'customer', 'partner', 'vendor', 'developer']).default('all'),
  q: z.string().trim().max(60).optional(),
});

async function target(id) {
  const { rows } = await query('SELECT id, email, full_name, role, is_active, password_hash, must_change_password, sessions_valid_after FROM users WHERE id = $1', [id]);
  if (!rows[0]) throw new HttpError(404, 'not_found', 'User not found');
  return rows[0];
}
const isMe = (req, u) => String(u.id) === String(req.user.id);

devUserRoutes.get('/users', asyncHandler(async (req, res) => {
  const f = parse(listSchema, req.query);
  const w = [];
  const p = [];
  if (f.role !== 'all') { p.push(f.role); w.push('u.role = $' + p.length); }
  if (f.q) { p.push('%' + f.q.replace(/[\\%_]/g, (c) => '\\' + c) + '%'); w.push('(u.full_name ILIKE $' + p.length + ' OR u.email ILIKE $' + p.length + ')'); }
  const { rows } = await query(
    `SELECT u.id, u.full_name, u.email, u.role, u.partner_stage, u.is_active, u.must_change_password, u.phone, u.created_at,
       (SELECT max(a.at) FROM audit_log a WHERE a.actor_user_id = u.id AND a.action = 'auth.login') AS last_login
     FROM users u ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY u.role, u.full_name LIMIT 200`, p);
  res.json({ users: rows.map((u) => ({
    id: String(u.id), name: u.full_name, email: u.email, role: u.role, stage: u.partner_stage, active: u.is_active,
    mustChange: u.must_change_password, phone: u.phone ? maskPhone(u.phone) : null, createdAt: u.created_at, lastLogin: u.last_login,
  })) });
}));

devUserRoutes.post('/users/sign-out-all', limiter, asyncHandler(async (req, res) => {
  const { role } = parse(z.object({ role: z.enum(['partner', 'vendor', 'customer']) }), req.body);
  const r = await query('UPDATE users SET sessions_valid_after = now() WHERE role = $1', [role]);
  await audit(req, { action: 'user.signed_out_all', entityType: 'role', entityId: role, actorUserId: req.user.id, details: { count: r.rowCount } });
  res.json({ ok: true, count: r.rowCount });
}));

devUserRoutes.post('/users/:id/sign-out', limiter, asyncHandler(async (req, res) => {
  const { id } = parse(idSchema, req.params);
  const u = await target(id);
  if (isMe(req, u)) throw new HttpError(400, 'bad_request', 'Use Sign out in the menu for your own account');
  await query('UPDATE users SET sessions_valid_after = now() WHERE id = $1', [id]);
  await audit(req, { action: 'user.signed_out', entityType: 'user', entityId: id, actorUserId: req.user.id, details: { role: u.role } });
  res.json({ ok: true });
}));

devUserRoutes.post('/users/:id/active', limiter, asyncHandler(async (req, res) => {
  const { id } = parse(idSchema, req.params);
  const { active } = parse(z.object({ active: z.boolean() }), req.body);
  const u = await target(id);
  if (!['customer', 'vendor'].includes(u.role)) throw new HttpError(409, 'needs_approval', 'Partner accounts can only be added or removed with approval from all three partners.');
  await query('UPDATE users SET is_active = $2, sessions_valid_after = now() WHERE id = $1', [id, active]);
  await audit(req, { action: active ? 'user.reactivated' : 'user.deactivated', entityType: 'user', entityId: id, actorUserId: req.user.id, details: { role: u.role } });
  res.json({ ok: true });
}));

devUserRoutes.post('/users/:id/temp-password', limiter, asyncHandler(async (req, res) => {
  const { id } = parse(idSchema, req.params);
  const u = await target(id);
  if (isMe(req, u)) throw new HttpError(400, 'bad_request', 'Use Change password for your own account');
  if (!['partner', 'vendor'].includes(u.role)) throw new HttpError(409, 'not_supported', 'Temporary passwords are for partners and dealers. Customers use Forgot password on the shop.');
  if (!u.is_active) throw new HttpError(409, 'inactive', 'That account is switched off');
  const temp = generateTempPassword();
  await query('UPDATE users SET password_hash = $2, must_change_password = true, sessions_valid_after = now() WHERE id = $1', [id, await hashPassword(temp)]);
  const text = [
    'Hello ' + u.full_name + ',', '',
    'The developer reset your Pyfon password.',
    'Temporary password: ' + temp, '',
    'To choose your own: open the sign-in page, tap "Change password" under the password box, enter your email, this temporary password and a new password (at least 10 characters). Then sign in.', '',
    'If you did not expect this, tell the other partners straight away.', '', 'Pyfon Brands',
  ].join('\n');
  const sent = await sendEmail({ to: u.email, subject: 'Your temporary Pyfon password', text });
  if (!sent) {
    await query('UPDATE users SET password_hash = $2, must_change_password = $3, sessions_valid_after = $4 WHERE id = $1', [id, u.password_hash, u.must_change_password, u.sessions_valid_after]);
    throw new HttpError(502, 'send_failed', 'The email was not sent, so the password was NOT changed. Check the Brevo settings.');
  }
  await audit(req, { action: 'user.temp_password_sent', entityType: 'user', entityId: id, actorUserId: req.user.id, details: { role: u.role, to: maskEmail(u.email) } });
  res.json({ ok: true, sentTo: maskEmail(u.email) });
}));
