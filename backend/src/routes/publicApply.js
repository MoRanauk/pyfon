import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { INTERFACE_KINDS } from '../config.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { sendEmail } from '../mail.js';

// Public "apply to sell with us" form. No account is created.
const router = Router();
const tooMany = (req, res) =>
  res.status(429).json({ error: { code: 'too_many_attempts', message: 'Too many applications from this connection. Try again later.' } });
const hourly = rateLimit({ windowMs: 60 * 60 * 1000, limit: 3, standardHeaders: true, legacyHeaders: false, handler: tooMany });
const daily = rateLimit({ windowMs: 24 * 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, handler: tooMany });

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(25),
  email: z.string().trim().toLowerCase().email().max(200).optional().or(z.literal('')),
  role: z.enum(['dealer', 'designer', 'both']),
  link: z.string().trim().max(300).optional(),
  about: z.string().trim().min(10).max(1500),
  website: z.string().max(200).optional(),
});

router.post('/', hourly, daily, asyncHandler(async (req, res) => {
  if (INTERFACE_KINDS[req.interfaceCode] !== 'customer') {
    throw new HttpError(403, 'not_allowed_here', 'Applications are only taken on the customer stores');
  }
  const d = parse(schema, req.body);
  if (d.website) return res.json({ ok: true });
  const ins = await query(
    'INSERT INTO seller_applications (name, phone, email, role, link, about, shop) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
    [d.name, d.phone, d.email || null, d.role, d.link || null, d.about, req.interfaceCode]
  );
  await audit(req, { action: 'apply.received', entityType: 'seller_application', entityId: String(ins.rows[0].id), actorUserId: null, details: { role: d.role, shop: req.interfaceCode } });
  const to = process.env.APPLY_NOTIFY_EMAIL || process.env.BREVO_SENDER_EMAIL;
  if (to) {
    try {
      await sendEmail({
        to,
        subject: 'New seller application: ' + d.name,
        text: ['Name: ' + d.name, 'Phone: ' + d.phone, 'Email: ' + (d.email || 'none'), 'Role: ' + d.role, 'Link: ' + (d.link || 'none'), '', d.about].join('\n'),
      });
    } catch (e) { /* the application is saved even if the email fails */ }
  }
  res.status(201).json({ ok: true });
}));

export const publicApplyRoutes = router;
export default router;
