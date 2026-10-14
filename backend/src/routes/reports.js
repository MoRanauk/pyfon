import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { asyncHandler } from '../errors.js';
import { parse } from '../validate.js';

export const reportRoutes = Router();

const daysSchema = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) });
const hoursSchema = z.object({ hours: z.coerce.number().int().min(1).max(8760).default(24) });

const STAGE_OF_STEP = {
  finance_quote: 'finance',
  creative: 'creative',
  production: 'production',
  finance_delivery: 'finance',
};

reportRoutes.get('/reports/sales', asyncHandler(async (req, res) => {
  const { days } = parse(daysSchema, req.query);
  const since = "created_at >= now() - make_interval(days => $1::int)";

  const byStorefront = await query(
    `SELECT storefront_code, count(*)::int AS orders, COALESCE(sum(total_kes), 0)::int AS total_kes
       FROM orders WHERE status = 'placed' AND ${since}
      GROUP BY storefront_code ORDER BY storefront_code`,
    [days]
  );
  const byDay = await query(
    `SELECT created_at::date AS day, count(*)::int AS orders, COALESCE(sum(total_kes), 0)::int AS total_kes
       FROM orders WHERE status = 'placed' AND ${since}
      GROUP BY created_at::date ORDER BY day`,
    [days]
  );
  const topItems = await query(
    `SELECT l.sku, l.name, sum(l.qty)::int AS qty, sum(l.qty * l.unit_price_kes)::int AS total_kes
       FROM order_lines l JOIN orders o ON o.id = l.order_id
      WHERE o.status = 'placed' AND o.created_at >= now() - make_interval(days => $1::int)
      GROUP BY l.sku, l.name ORDER BY total_kes DESC LIMIT 10`,
    [days]
  );
  const quotes = await query(
    `SELECT kind, status, count(*)::int AS count
       FROM quote_requests WHERE ${since}
      GROUP BY kind, status ORDER BY kind, status`,
    [days]
  );
  res.json({
    days,
    ordersByStorefront: byStorefront.rows.map((r) => ({ storefront: r.storefront_code, orders: r.orders, totalKes: r.total_kes })),
    ordersByDay: byDay.rows.map((r) => ({ day: r.day, orders: r.orders, totalKes: r.total_kes })),
    topItems: topItems.rows.map((r) => ({ sku: r.sku, name: r.name, qty: r.qty, totalKes: r.total_kes })),
    quoteRequests: quotes.rows,
  });
}));

reportRoutes.get('/reports/jobs-per-stage', asyncHandler(async (req, res) => {
  const byStatus = await query('SELECT status, count(*)::int AS count FROM jobs GROUP BY status ORDER BY status');
  const openByStep = await query(
    "SELECT current_step AS step, count(*)::int AS count FROM jobs WHERE status = 'open' GROUP BY current_step ORDER BY current_step"
  );
  const stepStatus = await query(
    `SELECT s.step, s.status, count(*)::int AS count
       FROM job_steps s JOIN jobs j ON j.id = s.job_id
      WHERE j.status = 'open' GROUP BY s.step, s.status ORDER BY s.step, s.status`
  );
  res.json({ byStatus: byStatus.rows, openByStep: openByStep.rows, openStepStatus: stepStatus.rows });
}));

reportRoutes.get('/reports/stuck', asyncHandler(async (req, res) => {
  const { hours } = parse(hoursSchema, req.query);
  const { rows } = await query(
    `SELECT j.ref, j.current_step, s.status AS step_status,
            COALESCE(prev.signed_off_at, j.created_at) AS waiting_since,
            (extract(epoch FROM (now() - COALESCE(prev.signed_off_at, j.created_at))) / 3600)::int AS hours_waiting
       FROM jobs j
       JOIN job_steps s ON s.job_id = j.id AND s.step = j.current_step
       LEFT JOIN job_steps prev ON prev.job_id = j.id AND prev.position = s.position - 1
      WHERE j.status = 'open'
        AND COALESCE(prev.signed_off_at, j.created_at) < now() - make_interval(hours => $1::int)
      ORDER BY waiting_since ASC LIMIT 100`,
    [hours]
  );
  res.json({
    hours,
    jobs: rows.map((r) => ({
      jobRef: r.ref,
      step: r.current_step,
      stepStatus: r.step_status,
      waitingOnStage: STAGE_OF_STEP[r.current_step] || null,
      waitingSince: r.waiting_since,
      hoursWaiting: r.hours_waiting,
    })),
  });
}));
