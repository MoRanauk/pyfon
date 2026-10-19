import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { asyncHandler } from '../errors.js';
import { parse } from '../validate.js';

// Developer desk: health, traffic, request log and request tracing. Read-only.
export const devSystemRoutes = Router();

async function safe(sql, params = []) {
  try { return (await query(sql, params)).rows; } catch (e) { return null; }
}
const KEYS = ['DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGINS', 'CLOUDINARY_URL', 'BREVO_API_KEY', 'BREVO_SENDER_EMAIL', 'OPENWA_URL', 'OPENWA_SESSION', 'OPENWA_KEY', 'SMS_GATEWAY_URL', 'SMS_GATEWAY_KEY', 'SITE_URL', 'SENTRY_DSN'];
const COUNTS = [
  ['Customers', `SELECT count(*)::int AS n FROM users WHERE role = 'customer'`],
  ['Partners', `SELECT count(*)::int AS n FROM users WHERE role = 'partner'`],
  ['Products and services', 'SELECT count(*)::int AS n FROM catalog_items'],
  ['Orders', 'SELECT count(*)::int AS n FROM orders'],
  ['Quote requests', 'SELECT count(*)::int AS n FROM quote_requests'],
  ['Open jobs', `SELECT count(*)::int AS n FROM jobs WHERE status = 'open'`],
  ['Open tickets', `SELECT count(*)::int AS n FROM tickets WHERE status <> 'resolved'`],
  ['Approvals waiting', `SELECT count(*)::int AS n FROM approval_requests WHERE status = 'pending'`],
  ['Messages queued or failed', `SELECT count(*)::int AS n FROM outbound_messages WHERE status IN ('queued','failed')`],
];

async function pingOpenWa() {
  const base = (process.env.OPENWA_URL || '').replace(/\/+$/, '');
  const session = process.env.OPENWA_SESSION || '';
  const key = process.env.OPENWA_KEY || '';
  if (!base || !session || !key) return { ok: false, note: 'Not set up in .env' };
  try {
    const r = await fetch(base + '/api/sessions/' + encodeURIComponent(session), { headers: { [process.env.OPENWA_KEY_HEADER || 'X-API-Key']: key }, signal: AbortSignal.timeout(5000) });
    return { ok: r.ok, note: 'HTTP ' + r.status };
  } catch (e) { return { ok: false, note: 'Cannot reach it (it may be off)' }; }
}

devSystemRoutes.get('/health', asyncHandler(async (req, res) => {
  const t0 = Date.now();
  const db = await safe('SELECT pg_database_size(current_database())::bigint AS bytes');
  const dbMs = Date.now() - t0;
  const counts = await Promise.all(COUNTS.map(async ([label, sql]) => { const r = await safe(sql); return { label, n: r ? r[0].n : null }; }));
  const day = await safe(`SELECT count(*)::int AS total, count(*) FILTER (WHERE status >= 500)::int AS "serverErrors",
    count(*) FILTER (WHERE status >= 400 AND status < 500)::int AS "clientErrors", coalesce(round(avg(duration_ms)), 0)::int AS "avgMs"
    FROM request_log WHERE at > now() - interval '24 hours'`);
  res.json({
    server: { node: process.version, uptimeSeconds: Math.round(process.uptime()), memoryMb: Math.round(process.memoryUsage().rss / 1048576), env: process.env.NODE_ENV || 'development' },
    database: { ok: Boolean(db), ms: dbMs, sizeMb: db ? Math.round(Number(db[0].bytes) / 1048576) : null },
    openwa: await pingOpenWa(),
    counts,
    last24h: day ? day[0] : null,
    config: KEYS.map((k) => ({ name: k, set: Boolean(process.env[k]) })),
  });
}));

const reqSchema = z.object({
  interface: z.string().trim().max(20).optional(),
  kind: z.enum(['all', 'errors', 'server', 'slow']).default('errors'),
  q: z.string().trim().max(80).optional(),
  hours: z.coerce.number().int().min(1).max(168).default(24),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

devSystemRoutes.get('/requests', asyncHandler(async (req, res) => {
  const f = parse(reqSchema, req.query);
  const w = ["r.at > now() - ($1::int * interval '1 hour')"];
  const p = [f.hours];
  if (f.interface) { p.push(f.interface); w.push('r.interface = $' + p.length); }
  if (f.kind === 'errors') w.push('r.status >= 400');
  if (f.kind === 'server') w.push('r.status >= 500');
  if (f.kind === 'slow') w.push('r.duration_ms >= 1000');
  if (f.q) { p.push('%' + f.q.replace(/[\\%_]/g, (c) => '\\' + c) + '%'); w.push('r.path ILIKE $' + p.length); }
  p.push(f.limit);
  const { rows } = await query(
    'SELECT r.id, r.at, r.request_id, r.interface, r.method, r.path, r.status, r.duration_ms, u.full_name AS who FROM request_log r LEFT JOIN users u ON u.id = r.user_id WHERE '
    + w.join(' AND ') + ' ORDER BY r.id DESC LIMIT $' + p.length, p);
  res.json({ rows: rows.map((r) => ({ id: String(r.id), at: r.at, requestId: r.request_id, iface: r.interface, method: r.method, path: r.path, status: r.status, ms: r.duration_ms, who: r.who })) });
}));

devSystemRoutes.get('/traffic', asyncHandler(async (req, res) => {
  const per = await query(`SELECT coalesce(interface, 'unknown') AS iface, count(*) FILTER (WHERE at > now() - interval '1 hour')::int AS hour,
    count(*)::int AS day, count(*) FILTER (WHERE status >= 500)::int AS errors, coalesce(round(avg(duration_ms)), 0)::int AS "avgMs"
    FROM request_log WHERE at > now() - interval '24 hours' GROUP BY 1 ORDER BY 3 DESC`);
  const slow = await query(`SELECT method, path, count(*)::int AS n, round(avg(duration_ms))::int AS "avgMs", max(duration_ms)::int AS "maxMs"
    FROM request_log WHERE at > now() - interval '24 hours' GROUP BY 1, 2 ORDER BY 4 DESC LIMIT 8`);
  const bad = await query(`SELECT method, path, status, count(*)::int AS n, max(at) AS last
    FROM request_log WHERE at > now() - interval '24 hours' AND status >= 400 GROUP BY 1, 2, 3 ORDER BY 4 DESC LIMIT 8`);
  res.json({ interfaces: per.rows, slow: slow.rows, bad: bad.rows });
}));

devSystemRoutes.get('/trace/:id', asyncHandler(async (req, res) => {
  const id = parse(z.string().trim().min(4).max(100), req.params.id);
  const r = await query('SELECT at, interface, method, path, status, duration_ms AS ms FROM request_log WHERE request_id = $1 ORDER BY id', [id]);
  const a = await query(
    'SELECT a.at, a.interface, a.action, a.entity_type, a.entity_id, a.details, u.full_name AS actor FROM audit_log a LEFT JOIN users u ON u.id = a.actor_user_id WHERE a.request_id = $1 ORDER BY a.id', [id]);
  res.json({ requests: r.rows, audit: a.rows });
}));
