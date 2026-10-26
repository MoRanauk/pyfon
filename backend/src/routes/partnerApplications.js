import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { withTransaction } from '../db/tx.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { sendEmail } from '../mail.js';

// Emails to an applicant come from the shop they applied on.
const SHOP_LABEL = { mco: 'M & Co. Brands', prestige: 'Pyfon Gift Hub', trim: 'TriM Atelier' };
const shopOf = (a) => SHOP_LABEL[a.shop] || 'Pyfon Brands';

// Partners only. Seller applications: see them, accept (sends a one-time sign-up link), decline, message.
export const partnerApplicationRoutes = Router();

const idSchema = z.object({ id: z.string().uuid() });
const portal = () => (process.env.DEALER_PORTAL_URL || 'http://localhost:5178').replace(/\/+$/, '');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

async function loadApp(id) {
  const { rows } = await query('SELECT * FROM seller_applications WHERE id = $1', [id]);
  if (!rows[0]) throw new HttpError(404, 'not_found', 'Application not found');
  return rows[0];
}
async function mark(id, status, userId) {
  await query('UPDATE seller_applications SET status = $2, handled_by = $3, handled_at = now() WHERE id = $1', [id, status, userId]);
}

const shape = (r) => ({
  id: String(r.id), name: r.name, phone: r.phone, email: r.email, role: r.role, link: r.link, about: r.about,
  shop: r.shop, status: r.status, createdAt: r.created_at, handledAt: r.handled_at, handledBy: r.handled_by_name || null,
  hasAccount: r.has_account, inviteUntil: r.invite_until,
});

partnerApplicationRoutes.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT a.*, u.full_name AS handled_by_name,
       EXISTS (SELECT 1 FROM application_invites i WHERE i.application_id = a.id AND i.used_at IS NOT NULL) AS has_account,
       (SELECT max(i.expires_at) FROM application_invites i WHERE i.application_id = a.id AND i.used_at IS NULL AND i.expires_at > now()) AS invite_until
     FROM seller_applications a LEFT JOIN users u ON u.id = a.handled_by
     ORDER BY (a.status = 'new') DESC, a.created_at DESC LIMIT 200`
  );
  res.json({ applications: rows.map(shape) });
}));

const acceptSchema = z.object({
  code: z.string().trim().min(2).max(30),
  speciality: z.string().trim().min(2).max(100),
  note: z.string().trim().max(500).optional(),
});

partnerApplicationRoutes.post('/:id/accept', asyncHandler(async (req, res) => {
  const { id } = parse(idSchema, req.params);
  const b = parse(acceptSchema, req.body);
  const code = b.code.toUpperCase();
  if (!/^[A-Z0-9-]{2,30}$/.test(code)) throw new HttpError(400, 'bad_code', 'The dealer code can only have letters, numbers and dashes (2 to 30).');
  const a = await loadApp(id);
  if (a.role === 'designer') throw new HttpError(409, 'designer_only', 'Designers do not have a portal yet. Use Send message instead.');
  if (!a.email) throw new HttpError(400, 'no_email', 'This applicant gave no email. Use Send message by WhatsApp.');
  const done = await query('SELECT 1 FROM application_invites WHERE application_id = $1 AND used_at IS NOT NULL', [id]);
  if (done.rows[0]) throw new HttpError(409, 'has_account', 'This applicant already created an account.');
  const taken = await query(
    `SELECT (EXISTS (SELECT 1 FROM users WHERE vendor_code = $1)
          OR EXISTS (SELECT 1 FROM application_invites WHERE vendor_code = $1 AND application_id <> $2)) AS taken`,
    [code, id]
  );
  if (taken.rows[0].taken) throw new HttpError(409, 'code_taken', 'That dealer code is already used. Choose another.');

  const token = crypto.randomBytes(32).toString('base64url');
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO vendors (code, name, speciality, status) VALUES ($1, $2, $3, 'hidden')
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, speciality = EXCLUDED.speciality`,
      [code, a.name, b.speciality]
    );
    await client.query('UPDATE application_invites SET expires_at = now() WHERE application_id = $1 AND used_at IS NULL', [id]);
    await client.query(
      "INSERT INTO application_invites (application_id, token_hash, vendor_code, email, created_by, expires_at) VALUES ($1, $2, $3, $4, $5, now() + interval '7 days')",
      [id, sha(token), code, a.email, req.user.id]
    );
  });
  const link = portal() + '/join?token=' + token;
  const sent = await sendEmail({
    to: a.email,
    fromName: shopOf(a),
    subject: 'Your ' + shopOf(a) + ' dealer invitation',
    text: ['Hello ' + a.name + ',', '', 'Thank you for applying to work with ' + shopOf(a) + '. We would like to welcome you as a dealer.',
      ...(b.note ? ['', b.note] : []), '',
      'Create your dealer account here. The link works once and expires in 7 days:', link, '',
      'If you did not apply, you can ignore this email.', '', shopOf(a)].join('\n'),
  });
  if (!sent) {
    await query('UPDATE application_invites SET expires_at = now() WHERE token_hash = $1', [sha(token)]);
    throw new HttpError(502, 'send_failed', 'The email was not sent, so no invitation was made. Check the Brevo settings.');
  }
  await mark(id, 'accepted', req.user.id);
  await audit(req, { action: 'application.accepted', entityType: 'seller_application', entityId: String(id), actorUserId: req.user.id, details: { code } });
  res.json({ ok: true });
}));

const declineSchema = z.object({ send: z.boolean().default(true), message: z.string().trim().max(500).optional() });

partnerApplicationRoutes.post('/:id/decline', asyncHandler(async (req, res) => {
  const { id } = parse(idSchema, req.params);
  const b = parse(declineSchema, req.body || {});
  const a = await loadApp(id);
  const done = await query('SELECT 1 FROM application_invites WHERE application_id = $1 AND used_at IS NOT NULL', [id]);
  if (done.rows[0]) throw new HttpError(409, 'has_account', 'This applicant already created an account.');
  await query('UPDATE application_invites SET expires_at = now() WHERE application_id = $1 AND used_at IS NULL', [id]);
  let emailed = false;
  if (b.send && a.email) {
    emailed = await sendEmail({
      to: a.email,
      fromName: shopOf(a),
      subject: 'Your application to ' + shopOf(a),
      text: ['Hello ' + a.name + ',', '', 'Thank you for your interest in working with ' + shopOf(a) + '. We are not able to take your application forward right now.',
        ...(b.message ? ['', b.message] : []), '', 'We wish you every success.', '', shopOf(a)].join('\n'),
    });
  }
  await mark(id, 'declined', req.user.id);
  await audit(req, { action: 'application.declined', entityType: 'seller_application', entityId: String(id), actorUserId: req.user.id, details: { emailed } });
  res.json({ ok: true, emailed });
}));

const messageSchema = z.object({ channel: z.enum(['email', 'whatsapp']), message: z.string().trim().min(5).max(1500) });

partnerApplicationRoutes.post('/:id/message', asyncHandler(async (req, res) => {
  const { id } = parse(idSchema, req.params);
  const b = parse(messageSchema, req.body);
  const a = await loadApp(id);
  if (b.channel === 'email') {
    if (!a.email) throw new HttpError(400, 'no_email', 'This applicant gave no email. Use WhatsApp.');
    const sent = await sendEmail({
      to: a.email,
      fromName: shopOf(a),
      subject: 'Message from ' + shopOf(a),
      text: ['Hello ' + a.name + ',', '', b.message, '', shopOf(a)].join('\n'),
    });
    if (!sent) throw new HttpError(502, 'send_failed', 'The email was not sent. Check the Brevo settings.');
  }
  if (a.status === 'new') await mark(id, 'contacted', req.user.id);
  await audit(req, { action: 'application.messaged', entityType: 'seller_application', entityId: String(id), actorUserId: req.user.id, details: { channel: b.channel } });
  res.json({ ok: true });
}));
