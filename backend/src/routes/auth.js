import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { z } from 'zod';
import { config, INTERFACE_KINDS } from '../config.js';
import { query } from '../db/pool.js';
import { audit } from '../audit.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { hashPassword, verifyPassword, DUMMY_HASH } from '../auth/password.js';
import { authenticateLoose } from '../middleware/auth.js';
import { sendEmail, sendSms, sendWhatsApp, resetChannels, maskEmail, maskPhone, normalizePhone } from '../mail.js';

const router = Router();

const tooMany = (req, res) =>
  res.status(429).json({ error: { code: 'too_many_attempts', message: 'Too many attempts. Try again later.' } });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, handler: tooMany });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, handler: tooMany });
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false, handler: tooMany });

const email = z.string().trim().toLowerCase().email().max(200);
const newPassword = z.string().min(10, 'Use at least 10 characters').max(128);

const registerSchema = z.object({ email, password: newPassword, full_name: z.string().trim().min(2).max(100), phone: z.string().trim().min(8, 'Enter your phone number').max(20) });
const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
const changeSchema = z.object({ current_password: z.string().min(1).max(128), new_password: newPassword });
const forgotSchema = z.object({ email, channel: z.enum(['email', 'sms', 'whatsapp']).default('email') });
const resetSchema = z.object({ email, code: z.string().trim().regex(/^\d{6}$/, 'The code has 6 digits'), new_password: newPassword });

const COOLDOWN_SECONDS = 120;
const codeHash = (c) => crypto.createHmac('sha256', config.jwtSecret).update(c).digest('hex');

const profile = (u) => ({ id: u.id, email: u.email, fullName: u.full_name, role: u.role, stage: u.partner_stage });

function cleanPhone(raw) {
  const s = String(raw).replace(/[\s()-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(s)) return null;
  if (s.startsWith('+254')) return /^\+254[17]\d{8}$/.test(s) ? normalizePhone('0' + s.slice(4)) : null;
  return s;
}

router.post('/register', registerLimiter, asyncHandler(async (req, res) => {
  if (INTERFACE_KINDS[req.interfaceCode] !== 'customer') {
    throw new HttpError(403, 'not_allowed_here', 'Registration is only available on the customer stores');
  }
  const data = parse(registerSchema, req.body);
  let phone = null;
  if (data.phone) {
    phone = cleanPhone(data.phone);
    if (!phone) throw new HttpError(400, 'bad_phone', 'Enter a valid phone number with its country code');
  }
  const hash = await hashPassword(data.password);
  let user;
  try {
    const { rows } = await query(
      "INSERT INTO users (email, password_hash, full_name, role, phone) VALUES ($1, $2, $3, 'customer', $4) RETURNING id, email, full_name, role, partner_stage",
      [data.email, hash, data.full_name, phone]
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

// ---- Password reset by code (customers and partners). The code goes by email, SMS or WhatsApp. ----
// The answer never says whether the account exists. Codes last 15 minutes, 5 tries, one new code per 2 minutes.
router.get('/reset-channels', (req, res) => res.json({ channels: resetChannels(), cooldownSeconds: COOLDOWN_SECONDS }));

router.post('/forgot-password', resetLimiter, asyncHandler(async (req, res) => {
  if (!req.interfaceCode) throw new HttpError(400, 'missing_interface', 'Send a valid X-Interface header');
  const data = parse(forgotSchema, req.body);
  if (!resetChannels().includes(data.channel)) {
    throw new HttpError(400, 'channel_unavailable', 'That way of receiving a code is not available yet');
  }
  const found = await query('SELECT id, email, role, phone FROM users WHERE lower(email) = $1 AND is_active', [data.email]);
  const u = found.rows[0] && found.rows[0].role === INTERFACE_KINDS[req.interfaceCode] ? found.rows[0] : null;

  let sentTo = data.channel === 'email' ? maskEmail(data.email) : null;
  let wait = COOLDOWN_SECONDS;
  if (u) {
    if (data.channel !== 'email') sentTo = u.phone ? maskPhone(u.phone) : null;
    const recent = await query(
      "SELECT ceil(extract(epoch from (created_at + ($2::int * interval '1 second') - now())))::int AS wait FROM password_resets WHERE user_id = $1 AND created_at > now() - ($2::int * interval '1 second') ORDER BY id DESC LIMIT 1",
      [u.id, COOLDOWN_SECONDS]
    );
    if (recent.rows[0]) {
      wait = Math.max(1, recent.rows[0].wait);
    } else if (data.channel === 'email' || u.phone) {
      const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      await query('UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [u.id]);
      await query("INSERT INTO password_resets (user_id, code_hash, expires_at) VALUES ($1, $2, now() + interval '15 minutes')", [u.id, codeHash(code)]);
      const msg = 'Pyfon Brands: your password code is ' + code + '. It works for 15 minutes. Never share it.';
      if (data.channel === 'email') await sendEmail({ to: u.email, subject: 'Your Pyfon Brands password code', text: msg + ' If you did not ask for it, ignore this message.' });
      else if (data.channel === 'sms') await sendSms({ to: u.phone, text: msg });
      else await sendWhatsApp({ to: u.phone, code });
    }
  }
  await audit(req, { action: 'auth.reset_requested', actorUserId: u ? u.id : null, details: { email: data.email, channel: data.channel } });
  res.json({ ok: true, sentTo, retryAfter: wait });
}));

router.post('/reset-password', resetLimiter, asyncHandler(async (req, res) => {
  if (!req.interfaceCode) throw new HttpError(400, 'missing_interface', 'Send a valid X-Interface header');
  const data = parse(resetSchema, req.body);
  const bad = () => new HttpError(400, 'invalid_code', 'That code is wrong or has expired. Ask for a new one.');
  const ur = await query('SELECT id, role FROM users WHERE lower(email) = $1 AND is_active', [data.email]);
  const u = ur.rows[0];
  if (!u || u.role !== INTERFACE_KINDS[req.interfaceCode]) throw bad();
  const rr = await query(
    'SELECT id, code_hash, attempts FROM password_resets WHERE user_id = $1 AND used_at IS NULL AND expires_at > now() ORDER BY id DESC LIMIT 1',
    [u.id]
  );
  const r = rr.rows[0];
  if (!r || r.attempts >= 5) throw bad();
  if (!crypto.timingSafeEqual(Buffer.from(codeHash(data.code)), Buffer.from(r.code_hash))) {
    await query('UPDATE password_resets SET attempts = attempts + 1 WHERE id = $1', [r.id]);
    throw bad();
  }
  await query('UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2', [await hashPassword(data.new_password), u.id]);
  await query('UPDATE password_resets SET used_at = now() WHERE id = $1', [r.id]);
  await audit(req, { action: 'auth.password_reset', entityType: 'user', entityId: u.id, actorUserId: u.id });
  res.json({ ok: true });
}));

router.get('/me', authenticateLoose, (req, res) => res.json({ user: req.user }));

export default router;
