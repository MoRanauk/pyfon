import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { withTransaction } from '../db/tx.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';

const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false });

const createSchema = z.object({
  subject: z.string().trim().min(3).max(150),
  body: z.string().trim().min(5).max(3000),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  jobRef: z.string().trim().regex(/^JOB-\d+$/i).optional(),
});
const commentSchema = z.object({ body: z.string().trim().min(1).max(3000) });
const statusSchema = z.object({ status: z.enum(['open', 'in_progress', 'resolved']) });
const listSchema = z.object({
  status: z.enum(['active', 'open', 'in_progress', 'resolved', 'all']).default('active'),
});

const COLS = `t.id, t.ref, t.subject, t.body, t.priority, t.status, t.interface,
  t.created_at, t.updated_at, j.ref AS job_ref`;

function shape(r) {
  return {
    ref: r.ref, subject: r.subject, body: r.body, priority: r.priority, status: r.status,
    interface: r.interface, jobRef: r.job_ref || null, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function cleanRef(v) {
  const ref = String(v).toUpperCase();
  if (!/^TKT-\d+$/.test(ref)) throw new HttpError(404, 'not_found', 'Ticket not found');
  return ref;
}

async function loadComments(ticketId) {
  const { rows } = await query(
    `SELECT c.id, c.body, c.created_at, u.full_name, u.role
       FROM ticket_comments c JOIN users u ON u.id = c.author_id
      WHERE c.ticket_id = $1 ORDER BY c.id`,
    [ticketId]
  );
  return rows.map((c) => ({ id: c.id, body: c.body, authorName: c.full_name, authorRole: c.role, createdAt: c.created_at }));
}

// ---------- Customer and partner: own tickets only ----------
export const ticketRoutes = Router();

ticketRoutes.post('/tickets', writeLimiter, asyncHandler(async (req, res) => {
  const body = parse(createSchema, req.body);
  let jobId = null;
  if (body.jobRef) {
    const jobRef = body.jobRef.toUpperCase();
    let r;
    if (req.user.role === 'customer') {
      r = await query(
        `SELECT j.id FROM jobs j
           LEFT JOIN orders o ON o.id = j.order_id
           LEFT JOIN quote_requests q ON q.id = j.quote_request_id
          WHERE j.ref = $1 AND (o.customer_id = $2 OR q.customer_id = $2)`,
        [jobRef, req.user.id]
      );
    } else {
      r = await query('SELECT id FROM jobs WHERE ref = $1', [jobRef]);
    }
    if (!r.rows.length) throw new HttpError(404, 'job_not_found', 'Job not found');
    jobId = r.rows[0].id;
  }
  const ins = await query(
    `INSERT INTO tickets (opened_by, interface, subject, body, priority, job_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [req.user.id, req.interfaceCode, body.subject, body.body, body.priority || 'normal', jobId]
  );
  const t = await query(`SELECT ${COLS} FROM tickets t LEFT JOIN jobs j ON j.id = t.job_id WHERE t.id = $1`, [ins.rows[0].id]);
  const ticket = shape(t.rows[0]);
  await audit(req, { action: 'ticket.opened', entityType: 'ticket', entityId: ticket.ref, actorUserId: req.user.id, details: { jobRef: ticket.jobRef, priority: ticket.priority } });
  res.status(201).json({ ticket });
}));

ticketRoutes.get('/tickets', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT ${COLS} FROM tickets t LEFT JOIN jobs j ON j.id = t.job_id
      WHERE t.opened_by = $1 ORDER BY t.created_at DESC LIMIT 100`,
    [req.user.id]
  );
  res.json({ tickets: rows.map(shape) });
}));

ticketRoutes.get('/tickets/:ref', asyncHandler(async (req, res) => {
  const ref = cleanRef(req.params.ref);
  const { rows } = await query(
    `SELECT ${COLS} FROM tickets t LEFT JOIN jobs j ON j.id = t.job_id
      WHERE t.ref = $1 AND t.opened_by = $2`,
    [ref, req.user.id]
  );
  if (!rows.length) throw new HttpError(404, 'not_found', 'Ticket not found');
  res.json({ ticket: shape(rows[0]), comments: await loadComments(rows[0].id) });
}));

ticketRoutes.post('/tickets/:ref/comments', writeLimiter, asyncHandler(async (req, res) => {
  const ref = cleanRef(req.params.ref);
  const body = parse(commentSchema, req.body);
  const comment = await withTransaction(async (client) => {
    const t = await client.query('SELECT id, status FROM tickets WHERE ref = $1 AND opened_by = $2 FOR UPDATE', [ref, req.user.id]);
    if (!t.rows.length) throw new HttpError(404, 'not_found', 'Ticket not found');
    const c = await client.query(
      'INSERT INTO ticket_comments (ticket_id, author_id, body) VALUES ($1, $2, $3) RETURNING id, body, created_at',
      [t.rows[0].id, req.user.id, body.body]
    );
    // A new comment on a resolved ticket reopens it.
    const newStatus = t.rows[0].status === 'resolved' ? 'open' : t.rows[0].status;
    await client.query('UPDATE tickets SET status = $1, updated_at = now() WHERE id = $2', [newStatus, t.rows[0].id]);
    return { id: c.rows[0].id, body: c.rows[0].body, createdAt: c.rows[0].created_at, ticketStatus: newStatus };
  });
  await audit(req, { action: 'ticket.comment', entityType: 'ticket', entityId: ref, actorUserId: req.user.id });
  res.status(201).json({ comment });
}));

// ---------- Developer: every ticket ----------
export const devTicketRoutes = Router();

devTicketRoutes.get('/tickets', asyncHandler(async (req, res) => {
  const q = parse(listSchema, req.query);
  let where = '';
  const params = [];
  if (q.status === 'active') where = "WHERE t.status IN ('open','in_progress')";
  else if (q.status !== 'all') { where = 'WHERE t.status = $1'; params.push(q.status); }
  const { rows } = await query(
    `SELECT ${COLS}, u.full_name AS opener_name, u.email AS opener_email, u.role AS opener_role
       FROM tickets t
       JOIN users u ON u.id = t.opened_by
       LEFT JOIN jobs j ON j.id = t.job_id
       ${where}
      ORDER BY CASE t.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, t.created_at ASC
      LIMIT 200`,
    params
  );
  res.json({
    tickets: rows.map((r) => ({ ...shape(r), openedBy: { name: r.opener_name, email: r.opener_email, role: r.opener_role } })),
  });
}));

devTicketRoutes.get('/tickets/:ref', asyncHandler(async (req, res) => {
  const ref = cleanRef(req.params.ref);
  const { rows } = await query(
    `SELECT ${COLS}, u.full_name AS opener_name, u.email AS opener_email, u.role AS opener_role
       FROM tickets t JOIN users u ON u.id = t.opened_by LEFT JOIN jobs j ON j.id = t.job_id
      WHERE t.ref = $1`,
    [ref]
  );
  if (!rows.length) throw new HttpError(404, 'not_found', 'Ticket not found');
  const r = rows[0];
  res.json({
    ticket: { ...shape(r), openedBy: { name: r.opener_name, email: r.opener_email, role: r.opener_role } },
    comments: await loadComments(r.id),
  });
}));

devTicketRoutes.post('/tickets/:ref/status', writeLimiter, asyncHandler(async (req, res) => {
  const ref = cleanRef(req.params.ref);
  const body = parse(statusSchema, req.body);
  const { rows } = await query(
    'UPDATE tickets SET status = $1, updated_at = now() WHERE ref = $2 RETURNING ref, status',
    [body.status, ref]
  );
  if (!rows.length) throw new HttpError(404, 'not_found', 'Ticket not found');
  await audit(req, { action: 'ticket.status', entityType: 'ticket', entityId: ref, actorUserId: req.user.id, details: { status: body.status } });
  res.json({ ticket: { ref: rows[0].ref, status: rows[0].status } });
}));

devTicketRoutes.post('/tickets/:ref/comments', writeLimiter, asyncHandler(async (req, res) => {
  const ref = cleanRef(req.params.ref);
  const body = parse(commentSchema, req.body);
  const t = await query('SELECT id FROM tickets WHERE ref = $1', [ref]);
  if (!t.rows.length) throw new HttpError(404, 'not_found', 'Ticket not found');
  const c = await query(
    'INSERT INTO ticket_comments (ticket_id, author_id, body) VALUES ($1, $2, $3) RETURNING id, body, created_at',
    [t.rows[0].id, req.user.id, body.body]
  );
  await query('UPDATE tickets SET updated_at = now() WHERE id = $1', [t.rows[0].id]);
  await audit(req, { action: 'ticket.comment', entityType: 'ticket', entityId: ref, actorUserId: req.user.id });
  res.status(201).json({ comment: { id: c.rows[0].id, body: c.rows[0].body, createdAt: c.rows[0].created_at } });
}));
