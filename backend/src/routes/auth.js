import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config, INTERFACE_KINDS } from '../config.js';
import { query } from '../db/pool.js';
import { audit } from '../audit.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { hashPassword, verifyPassword, DUMMY_HASH } from '../auth/password.js';
import { authenticateLoose } from '../middleware/auth.js';

const router = Router();

const tooMany = (req, res) =>
  res.status(429).json({ error: { code: 'too_many_attempts', message: 'Too many attempts. Try again later.' } });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, handler: tooMany });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, handler: tooMany });

const email = z.string().trim().toLowerCase().email().max(200);
const newPassword = z.string().min(10, 'Use at least 10 characters').max(128);

const registerSchema = z.object({ email, password: newPassword, full_name: z.string().trim().min(2).max(100) });
const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
const changeSchema = z.object({ current_password: z.string().min(1).max(128), new_password: newPassword });

const profile = (u) => ({ id: u.id, email: u.email, fullName: u.full_name, role: u.role, stage: u.partner_stage });

router.post('/register', registerLimiter, asyncHandler(async (req, res) => {
  if (INTERFACE_KINDS[req.interfaceCode] !== 'customer') {
    throw new HttpError(403, 'not_allowed_here', 'Registration is only available on the customer stores');
  }
  const data = parse(registerSchema, req.body);
  const hash = await hashPassword(data.password);
  let user;
  try {
    const { rows } = await query(
      "INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, 'customer') RETURNING id, email, full_name, role, partner_stage",
      [data.email, hash, data.full_name]
    );
    user = rows[0];
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'email_taken', 'An account with this email already exists');
    throw err;
  }
  await audit(req, { action: 'user.registered', entityType: 'user', entityId: user.id, actorUserId: user.id });
  res.status(201).json({ user: profile(user) });
}));

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  if (!req.interfaceCode) throw new HttpError(400, 'missing_interface', 'Send a valid X-Interface header');
  const data = parse(loginSchema, req.body);
  const { rows } = await query('SELECT * FROM users WHERE lower(email) = $1', [data.email]);
  const user = rows[0];
  const passwordOk = await verifyPassword(data.password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !passwordOk || !user.is_active) {
    await audit(req, { action: 'auth.login_failed', actorUserId: user?.id ?? null, details: { email: data.email } });
    throw new HttpError(401, 'invalid_credentials', 'Invalid email or password');
  }
  if (INTERFACE_KINDS[req.interfaceCode] !== user.role) {
    await audit(req, { action: 'auth.login_denied_interface', entityType: 'user', entityId: user.id, actorUserId: user.id });
    throw new HttpError(403, 'not_allowed_here', 'Your account cannot sign in here');
  }
  const token = jwt.sign(
    { role: user.role, stage: user.partner_stage, iface: req.interfaceCode },
    config.jwtSecret,
    { algorithm: 'HS256', issuer: 'pyfon', subject: user.id, expiresIn: config.jwtExpiresIn }
  );
  await audit(req, { action: 'auth.login', entityType: 'user', entityId: user.id, actorUserId: user.id });
  res.json({ token, user: profile(user), mustChangePassword: user.must_change_password });
}));

router.post('/change-password', loginLimiter, authenticateLoose, asyncHandler(async (req, res) => {
  const data = parse(changeSchema, req.body);
  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!(await verifyPassword(data.current_password, rows[0].password_hash))) {
    throw new HttpError(403, 'wrong_password', 'Current password is incorrect');
  }
  if (data.new_password === data.current_password) {
    throw new HttpError(400, 'same_password', 'Choose a different password');
  }
  await query('UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2', [
    await hashPassword(data.new_password),
    req.user.id,
  ]);
  await audit(req, { action: 'auth.password_changed', entityType: 'user', entityId: req.user.id, actorUserId: req.user.id });
  res.json({ ok: true });
}));

router.get('/me', authenticateLoose, (req, res) => res.json({ user: req.user }));

export default router;
