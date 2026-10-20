import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { asyncHandler } from '../errors.js';
import { parse } from '../validate.js';

// Developer desk: numbers for the Traffic graphs page. Read-only.
export const devGraphRoutes = Router();
const schema = z.object({ hours: z.coerce.number().int().min(6).max(168).default(24) });

devGraphRoutes.get('/graphs', asyncHandler(async (req, res) => {
  const { hours } = parse(schema, req.query);
  const since = "date_trunc('hour', now()) - (($1::int - 1) * interval '1 hour')";
  const series = await query(
    `SELECT h.hour, coalesce(c.total, 0)::int AS total, coalesce(c."serverErrors", 0)::int AS "serverErrors",
       coalesce(c."clientErrors", 0)::int AS "clientErrors", coalesce(c."avgMs", 0)::int AS "avgMs", coalesce(c."maxMs", 0)::int AS "maxMs"
     FROM generate_series(${since}, date_trunc('hour', now()), interval '1 hour') AS h(hour)
     LEFT JOIN (
       SELECT date_trunc('hour', at) AS hour, count(*)::int AS total,
         count(*) FILTER (WHERE status >= 500)::int AS "serverErrors",
         count(*) FILTER (WHERE status >= 400 AND status < 500)::int AS "clientErrors",
         round(avg(duration_ms))::int AS "avgMs", max(duration_ms)::int AS "maxMs"
       FROM request_log WHERE at >= ${since} GROUP BY 1
     ) c ON c.hour = h.hour ORDER BY h.hour`, [hours]);
  const win = "at >= now() - ($1::int * interval '1 hour')";
  const statuses = await query(`SELECT status, count(*)::int AS n FROM request_log WHERE ${win} GROUP BY status ORDER BY n DESC LIMIT 15`, [hours]);
  const interfaces = await query(
    `SELECT coalesce(interface, 'unknown') AS iface, count(*)::int AS n, count(*) FILTER (WHERE status >= 400)::int AS errors
     FROM request_log WHERE ${win} GROUP BY 1 ORDER BY n DESC`, [hours]);
  const routes = await query(
    `SELECT method, path, count(*)::int AS n, round(avg(duration_ms))::int AS "avgMs", count(*) FILTER (WHERE status >= 400)::int AS errors
     FROM request_log WHERE ${win} GROUP BY 1, 2 ORDER BY n DESC LIMIT 10`, [hours]);
  const p95 = await query(`SELECT coalesce(round(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)), 0)::int AS ms FROM request_log WHERE ${win}`, [hours]);
  res.json({ hours, series: series.rows, statuses: statuses.rows, interfaces: interfaces.rows, routes: routes.rows, p95Ms: p95.rows[0].ms });
}));
