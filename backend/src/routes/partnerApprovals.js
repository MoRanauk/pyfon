import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { withTransaction } from '../db/tx.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { ACTIONS } from '../approvals/actions.js';

export const partnerApprovalRoutes = Router();

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: 'too_many_attempts', message: 'Too many attempts. Try again later.' } }),
});

function reqId(req) {
  if (!/^\d{1,18}$/.test(req.params.id)) throw new HttpError(404, 'request_not_found', 'Request not found');
  return req.params.id;
}

async function activePartners(client) {
  const { rows } = await client.query("SELECT id FROM users WHERE role = 'partner' AND is_active");
  if (rows.length !== 3) {
    throw new HttpError(409, 'partners_incomplete', 'Approvals need exactly three active partners');
  }
  return rows.map((r) => String(r.id));
}

function shape(r) {
  return {
    id: String(r.id), action: r.action, summary: r.summary, status: r.status,
    requestedBy: String(r.requested_by), createdAt: r.created_at, decidedAt: r.decided_at,
    executedAt: r.executed_at, result: r.result, votes: r.votes || [],
  };
}

const createSchema = z.object({
  action: z.enum(['price_change', 'product_delete', 'invoice_discount']),
  payload: z.record(z.any()),
});

partnerApprovalRoutes.post('/approvals', writeLimiter, asyncHandler(async (req, res) => {
  const body = parse(createSchema, req.body);
  const def = ACTIONS[body.action];
  const payload = parse(def.schema, body.payload);

  const out = await withTransaction(async (client) => {
    await activePartners(client);
    const item = await def.check(client, payload);
    const summary = def.summary(payload, item);
    const ins = await client.query(
      "INSERT INTO approval_requests (action, summary, payload, requested_by, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING *",
      [body.action, summary, JSON.stringify(payload), req.user.id]
    );
    const r = ins.rows[0];
    await client.query(
      "INSERT INTO approval_votes (request_id, partner_id, vote) VALUES ($1, $2, 'approve')",
      [r.id, req.user.id]
    );
    return r;
  });

  await audit(req, { action: 'approval.created', entityType: 'approval_request', entityId: String(out.id), actorUserId: req.user.id, details: { action: body.action, payload } });
  res.status(201).json({ request: shape(out) });
}));

partnerApprovalRoutes.get('/approvals', asyncHandler(async (req, res) => {
  const status = parse(z.enum(['pending', 'approved', 'rejected', 'executed', 'cancelled', 'all']).default('pending'), req.query.status);
  const params = [];
  let where = '';
  if (status !== 'all') { params.push(status); where = 'WHERE r.status = $1'; }
  const { rows } = await pool.query(
    "SELECT r.*, (SELECT json_agg(json_build_object('partnerId', v.partner_id, 'vote', v.vote, 'reason', v.reason)) FROM approval_votes v WHERE v.request_id = r.id) AS votes FROM approval_requests r " +
    where + ' ORDER BY r.id DESC LIMIT 50',
    params
  );
  res.json({ requests: rows.map(shape) });
}));

const voteSchema = z.object({
  vote: z.enum(['approve', 'reject']),
  reason: z.string().trim().min(3).max(500).optional(),
});

partnerApprovalRoutes.post('/approvals/:id/vote', writeLimiter, asyncHandler(async (req, res) => {
  const id = reqId(req);
  const body = parse(voteSchema, req.body);
  if (body.vote === 'reject' && !body.reason) {
    throw new HttpError(400, 'reason_required', 'Say why you are rejecting (3 to 500 characters)');
  }

  const out = await withTransaction(async (client) => {
    const found = await client.query('SELECT * FROM approval_requests WHERE id = $1 FOR UPDATE', [id]);
    const r = found.rows[0];
    if (!r) throw new HttpError(404, 'request_not_found', 'Request not found');
    if (r.status !== 'pending') throw new HttpError(409, 'not_pending', 'This request is already ' + r.status);

    const partners = await activePartners(client);
    if (!partners.includes(String(req.user.id))) throw new HttpError(403, 'not_a_partner', 'Only active partners can vote');

    const ins = await client.query(
      'INSERT INTO approval_votes (request_id, partner_id, vote, reason) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [id, req.user.id, body.vote, body.reason || null]
    );
    if (ins.rowCount === 0) throw new HttpError(409, 'already_voted', 'You have already voted on this request');

    let final = r;
    let executedResult = null;
    if (body.vote === 'reject') {
      const u = await client.query("UPDATE approval_requests SET status = 'rejected', decided_at = now() WHERE id = $1 RETURNING *", [id]);
      final = u.rows[0];
    } else {
      const c = await client.query(
        "SELECT count(*)::int AS n FROM approval_votes WHERE request_id = $1 AND vote = 'approve' AND partner_id = ANY($2::uuid[])",
        [id, partners]
      );
      if (c.rows[0].n >= 3) {
        const def = ACTIONS[r.action];
        executedResult = await def.execute(client, r.payload);
        const u = await client.query(
          "UPDATE approval_requests SET status = 'executed', decided_at = now(), executed_at = now(), result = $2 WHERE id = $1 RETURNING *",
          [id, JSON.stringify(executedResult)]
        );
        final = u.rows[0];
      }
    }
    return { final, executedResult };
  });

  await audit(req, { action: 'approval.vote', entityType: 'approval_request', entityId: id, actorUserId: req.user.id, details: { vote: body.vote, reason: body.reason || null } });
  if (out.executedResult) {
    await audit(req, { action: 'approval.executed', entityType: 'approval_request', entityId: id, actorUserId: req.user.id, details: { action: out.final.action, result: out.executedResult } });
  }
  res.json({ request: shape(out.final) });
}));

partnerApprovalRoutes.post('/approvals/:id/cancel', writeLimiter, asyncHandler(async (req, res) => {
  const id = reqId(req);
  const out = await withTransaction(async (client) => {
    const found = await client.query('SELECT * FROM approval_requests WHERE id = $1 FOR UPDATE', [id]);
    const r = found.rows[0];
    if (!r) throw new HttpError(404, 'request_not_found', 'Request not found');
    if (String(r.requested_by) !== String(req.user.id)) throw new HttpError(403, 'not_requester', 'Only the partner who asked can cancel');
    if (r.status !== 'pending') throw new HttpError(409, 'not_pending', 'This request is already ' + r.status);
    const u = await client.query("UPDATE approval_requests SET status = 'cancelled', decided_at = now(), cancelled_at = now() WHERE id = $1 RETURNING *", [id]);
    return u.rows[0];
  });
  await audit(req, { action: 'approval.cancelled', entityType: 'approval_request', entityId: id, actorUserId: req.user.id });
  res.json({ request: shape(out) });
}));

