import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';

// Developer desk, People group: Live sessions with a kill switch.
// "Live" = signed-in people seen in request_log. Ending a session sets users.sessions_valid_after,
// which makes auth.js refuse every older token for that person.
export const devSessionsRoutes = Router();

const listSchema = z.object({ minutes: z.coerce.number().int().min(5).max(480).default(60) });
const idSchema = z.object({ id: z.string().uuid() });

devSessionsRoutes.get('/sessions', asyncHandler(async (req, res) => {
  const { minutes } = parse(listSchema, req.query);
  const { rows } = await query(
    `SELECT u.id, u.email, u.full_name, u.role, u.partner_stage, s.hits, s.iface,
            extract(epoch from (now() - s.last_seen))::int AS ago
       FROM (SELECT user_id::text AS uid, max(at) AS last_seen, count(*)::int AS hits,
                    (array_agg(interface ORDER BY at DESC))[1] AS iface
               FROM request_log
              WHERE user_id IS NOT NULL AND at >= now() - ($1::int * interval '1 minute')
              GROUP BY 1) s
       JOIN users u ON u.id::text = s.uid
      WHERE u.is_active
      ORDER BY s.last_seen DESC LIMIT 200`, [minutes]);
  res.json({ minutes, me: req.user.id, rows });
}));

devSessionsRoutes.post('/sessions/end-all', asyncHandler(async (req, res) => {
  const r = await query('UPDATE users SET sessions_valid_after = now() WHERE id <> $1 AND is_active', [req.user.id]);
  await audit(req, { action: 'security.sessions_ended_all', entityType: 'system', entityId: 'sessions', actorUserId: req.user.id, details: { people: r.rowCount } });
  res.json({ ok: true, people: r.rowCount });
}));

devSessionsRoutes.post('/sessions/:id/end', asyncHandler(async (req, res) => {
  const { id } = parse(idSchema, req.params);
  if (id === req.user.id) throw new HttpError(400, 'own_session', 'You cannot end your own session here. Use sign out.');
  const r = await query('UPDATE users SET sessions_valid_after = now() WHERE id = $1 RETURNING email, role', [id]);
  if (!r.rows[0]) throw new HttpError(404, 'not_found', 'Person not found');
  await audit(req, { action: 'security.session_ended', entityType: 'user', entityId: id, actorUserId: req.user.id, details: { email: r.rows[0].email, role: r.rows[0].role } });
  res.json({ ok: true });
}));
