import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { asyncHandler } from '../errors.js';
import { parse } from '../validate.js';

// Heartbeat: every minute the backend checks the database and writes one row.
async function beat(boot) {
  const t = Date.now();
  try {
    await query('SELECT 1');
    await query('INSERT INTO uptime_checks (ok, db_ms, note) VALUES (true, $1, $2)', [Date.now() - t, boot ? 'boot' : null]);
  } catch (e) {
    try {
      await query('INSERT INTO uptime_checks (ok, db_ms, note) VALUES (false, $1, $2)', [Date.now() - t, String(e.message).slice(0, 200)]);
    } catch (e2) { /* database unreachable: the gap shows as an incident */ }
  }
}
let started = false;
function start() {
  if (started) return;
  started = true;
  setTimeout(() => beat(true), 5000).unref();
  setInterval(() => beat(false), 60000).unref();
  setInterval(() => query("DELETE FROM uptime_checks WHERE at < now() - interval '35 days'").catch(() => {}), 6 * 3600 * 1000).unref();
}
start();

export const devUptimeRoutes = Router();
const schema = z.object({ days: z.coerce.number().int().min(1).max(30).default(7) });

devUptimeRoutes.get('/uptime', asyncHandler(async (req, res) => {
  const { days } = parse(schema, req.query);
  const win = "at >= now() - ($1::int * interval '1 day')";
  const s = (await query(
    `SELECT count(*)::int AS total, count(*) FILTER (WHERE ok)::int AS good, min(at) AS first,
       coalesce(round(avg(db_ms)), 0)::int AS "avgMs", coalesce(max(db_ms), 0)::int AS "maxMs",
       count(*) FILTER (WHERE note = 'boot')::int AS restarts
     FROM uptime_checks WHERE ${win}`, [days])).rows[0];
  const recent = (await query('SELECT at, ok, db_ms AS "dbMs" FROM uptime_checks ORDER BY at DESC LIMIT 90')).rows.reverse();
  const inc = (await query(
    `SELECT at, prev_at AS "prevAt", ok, note FROM (
       SELECT at, ok, note, lag(at) OVER (ORDER BY at) AS prev_at FROM uptime_checks WHERE ${win}
     ) t WHERE ok = false OR (prev_at IS NOT NULL AND at - prev_at > interval '3 minutes')
     ORDER BY at DESC LIMIT 50`, [days])).rows;
  const incidents = inc.map((r) => r.ok === false
    ? { type: 'db', at: r.at, note: r.note }
    : { type: 'gap', from: r.prevAt, to: r.at, minutes: Math.round((new Date(r.at) - new Date(r.prevAt)) / 60000) });
  let pct = null;
  if (s.total) {
    const expected = Math.floor((Date.now() - new Date(s.first).getTime()) / 60000) + 1;
    pct = Math.min(100, Math.round((s.good / Math.max(expected, 1)) * 1000) / 10);
  }
  const last = recent.length ? recent[recent.length - 1] : null;
  res.json({ days, total: s.total, pct, avgMs: s.avgMs, maxMs: s.maxMs, restarts: s.restarts, last, recent, incidents });
}));
