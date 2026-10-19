import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncHandler } from '../errors.js';

// Read-only views every partner can see: the flow of orders, the team, and recent customers.
export const partnerInflowRoutes = Router();

partnerInflowRoutes.get('/inflow', asyncHandler(async (req, res) => {
  const open = await query(
    `SELECT j.ref, j.current_step AS "currentStep", js.status AS "stepStatus", j.created_at AS "createdAt",
            o.ref AS "orderRef", o.total_kes AS "totalKes", o.contact_name AS "orderName",
            q.ref AS "quoteRef", q.kind AS "quoteKind", q.contact_name AS "quoteName"
       FROM jobs j
       JOIN job_steps js ON js.job_id = j.id AND js.step = j.current_step
       LEFT JOIN orders o ON o.id = j.order_id
       LEFT JOIN quote_requests q ON q.id = j.quote_request_id
      WHERE j.status = 'open'
      ORDER BY j.created_at DESC LIMIT 200`
  );
  const days = await query(
    `SELECT to_char(d, 'YYYY-MM-DD') AS day, count(j.id)::int AS n
       FROM generate_series((current_date - 6)::timestamp, current_date::timestamp, interval '1 day') AS d
       LEFT JOIN jobs j ON j.created_at::date = d::date
      GROUP BY d ORDER BY d`
  );
  const stats = await query(
    `SELECT count(*) FILTER (WHERE created_at > now() - interval '24 hours')::int AS "new24",
            count(*) FILTER (WHERE status = 'open')::int AS "open",
            count(*) FILTER (WHERE status = 'complete')::int AS "complete"
       FROM jobs`
  );
  res.json({
    jobs: open.rows.map((r) => ({ ...r, customer: r.orderName || r.quoteName || '', orderName: undefined, quoteName: undefined })),
    days: days.rows,
    stats: stats.rows[0],
  });
}));

partnerInflowRoutes.get('/team', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, full_name AS "fullName", partner_stage AS stage, phone
       FROM users WHERE role = 'partner' AND is_active ORDER BY partner_stage, full_name`
  );
  res.json({ team: rows.map((r) => ({ id: String(r.id), fullName: r.fullName, stage: r.stage, phone: r.phone || null })) });
}));

partnerInflowRoutes.get('/customers', asyncHandler(async (req, res) => {
  const { rows } = await query(`
SELECT DISTINCT ON (digits) name, phone, email, ref, created_at AS "createdAt"
  FROM (
    SELECT o.contact_name AS name, o.contact_phone AS phone,
           COALESCE(o.contact_email, u.email) AS email, o.ref, o.created_at,
           regexp_replace(o.contact_phone, '[^0-9]', '', 'g') AS digits
      FROM orders o LEFT JOIN users u ON u.id = o.customer_id
    UNION ALL
    SELECT q.contact_name, q.contact_phone, COALESCE(q.contact_email, u.email), q.ref, q.created_at,
           regexp_replace(q.contact_phone, '[^0-9]', '', 'g')
      FROM quote_requests q LEFT JOIN users u ON u.id = q.customer_id
  ) t
 WHERE digits <> ''
 ORDER BY digits, created_at DESC`);
  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ customers: rows.slice(0, 100) });
}));
