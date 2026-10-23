import { Router } from 'express';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { audit } from '../audit.js';

// Developer only. Lists customers who asked for password help.
export const devPasswordHelpRoutes = Router();

devPasswordHelpRoutes.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT h.id, h.email, h.shop, h.status, h.created_at, h.handled_at, u.full_name
       FROM customer_password_help h LEFT JOIN users u ON u.id = h.user_id
      ORDER BY (h.status = 'open') DESC, h.created_at DESC LIMIT 100`
  );
  res.json({ requests: rows.map((r) => ({ id: String(r.id), email: r.email, name: r.full_name || '', shop: r.shop, status: r.status, createdAt: r.created_at, handledAt: r.handled_at })) });
}));

devPasswordHelpRoutes.post('/:id/done', asyncHandler(async (req, res) => {
  if (!/^\d{1,15}$/.test(String(req.params.id))) throw new HttpError(404, 'not_found', 'Request not found');
  const r = await query(
    "UPDATE customer_password_help SET status = 'done', handled_by = $2, handled_at = now() WHERE id = $1 AND status = 'open' RETURNING id",
    [req.params.id, req.user.id]
  );
  if (!r.rows.length) throw new HttpError(404, 'not_found', 'Request not found or already done');
  await audit(req, { action: 'password_help.handled', entityType: 'password_help', entityId: String(req.params.id), actorUserId: req.user.id, details: {} });
  res.json({ status: 'done' });
}));
