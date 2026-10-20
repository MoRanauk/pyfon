import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';

// Developer desk, Tools group: Commands. A fixed list. No typed input, no shell, nothing that changes data.
export const devCommandRoutes = Router();

const KEYS = ['DATABASE_URL', 'JWT_SECRET', 'PORT', 'CORS_ORIGINS', 'DB_DRIVER', 'CLOUDINARY_URL', 'OPENWA_URL', 'OPENWA_SESSION', 'OPENWA_KEY',
  'BREVO_API_KEY', 'BREVO_SENDER_EMAIL', 'BREVO_SENDER_NAME', 'CF_ACCOUNT_ID', 'CF_AI_TOKEN', 'SITE_URL', 'SMS_GATEWAY_URL', 'SMS_GATEWAY_KEY', 'SENTRY_DSN'];

const COMMANDS = [
  { id: 'server', label: 'Server facts', about: 'Node version, time since the server started, memory use.',
    run: async () => ['Node ' + process.version, 'Up ' + Math.round(process.uptime() / 60) + ' minutes', 'Memory ' + Math.round(process.memoryUsage().rss / 1048576) + ' MB', 'Mode ' + (process.env.NODE_ENV || 'not set')] },
  { id: 'database', label: 'Database check', about: 'Is the database answering, how fast, how big.',
    run: async () => {
      const t = Date.now();
      const { rows } = await query("SELECT pg_size_pretty(pg_database_size(current_database())) AS size, (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public')::int AS tables");
      return ['Answered in ' + (Date.now() - t) + ' ms', 'Size ' + rows[0].size, rows[0].tables + ' tables'];
    } },
  { id: 'tables', label: 'Biggest tables', about: 'The 15 tables with the most rows (approximate counts).',
    run: async () => {
      const { rows } = await query('SELECT relname, n_live_tup::bigint AS n FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 15');
      return rows.map((r) => r.relname + ': about ' + r.n);
    } },
  { id: 'logs', label: 'Log sizes', about: 'How many rows the request log and audit log hold. Useful before the free database fills up.',
    run: async () => {
      const out = [];
      const r = await query('SELECT count(*)::bigint AS n, min(at) AS oldest FROM request_log');
      out.push('request_log: ' + r.rows[0].n + ' rows, oldest ' + (r.rows[0].oldest ? new Date(r.rows[0].oldest).toISOString().slice(0, 10) : 'none'));
      try { const a = await query('SELECT count(*)::bigint AS n FROM audit_log'); out.push('audit_log: ' + a.rows[0].n + ' rows'); }
      catch (e) { out.push('audit_log: could not read'); }
      return out;
    } },
  { id: 'env', label: 'Settings check', about: 'Which settings are filled in. Shows only set or missing, never the value.',
    run: async () => KEYS.map((k) => (process.env[k] ? 'SET      ' : 'MISSING  ') + k) },
  { id: 'outside', label: 'Outside services', about: 'Can the backend reach Brevo, Cloudflare and Cloudinary? Any answer counts as reachable.',
    run: async () => {
      const out = [];
      for (const [n, u] of [['Brevo', 'https://api.brevo.com'], ['Cloudflare', 'https://api.cloudflare.com'], ['Cloudinary', 'https://api.cloudinary.com']]) {
        const t = Date.now();
        try { await fetch(u, { signal: AbortSignal.timeout(6000) }); out.push(n + ': reachable, ' + (Date.now() - t) + ' ms'); }
        catch (e) { out.push(n + ': NOT reachable'); }
      }
      return out;
    } },
];

const idSchema = z.object({ id: z.string().regex(/^[a-z]{1,20}$/) });

devCommandRoutes.get('/commands', asyncHandler(async (req, res) => {
  res.json({ commands: COMMANDS.map(({ id, label, about }) => ({ id, label, about })) });
}));

devCommandRoutes.post('/commands/:id/run', asyncHandler(async (req, res) => {
  const { id } = parse(idSchema, req.params);
  const c = COMMANDS.find((x) => x.id === id);
  if (!c) throw new HttpError(404, 'not_found', 'No such command');
  let lines;
  try { lines = await c.run(); } catch (e) { lines = ['Failed: ' + String(e.message).slice(0, 200)]; }
  await audit(req, { action: 'tools.command_run', entityType: 'system', entityId: id, actorUserId: req.user.id, details: {} });
  res.json({ at: new Date().toISOString(), lines });
}));
