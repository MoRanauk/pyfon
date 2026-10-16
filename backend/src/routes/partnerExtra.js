import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { withTransaction } from '../db/tx.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { STEPS } from '../jobs/createJob.js';
import { STEP_STAGE, workspaceOf, lockJob, actingFor } from '../jobs/workflow.js';

export const partnerExtraRoutes = Router();

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: 'too_many_attempts', message: 'Too many attempts. Try again later.' } }),
});

function jobRef(req) {
  const ref = req.params.ref;
  if (!/^JOB-\d{6,}$/.test(ref)) throw new HttpError(404, 'job_not_found', 'Job not found');
  return ref;
}
function requestId(req) {
  if (!/^\d{1,18}$/.test(req.params.id)) throw new HttpError(404, 'request_not_found', 'Request not found');
  return req.params.id;
}

// Guard that runs BEFORE the normal sign-off route: a step cannot be signed until its work is recorded.
partnerExtraRoutes.post('/jobs/:ref/sign-off', asyncHandler(async (req, res, next) => {
  const { rows } = await query(
    `SELECT j.current_step, j.production_mode, j.quote_request_id, q.quoted_price_kes
       FROM jobs j LEFT JOIN quote_requests q ON q.id = j.quote_request_id WHERE j.ref = $1`,
    [jobRef(req)]
  );
  const j = rows[0];
  if (j && j.current_step === 'finance_quote' && j.quote_request_id && j.quoted_price_kes == null) {
    throw new HttpError(409, 'quote_price_missing', 'Set the quote price before signing this step');
  }
  if (j && j.current_step === 'production' && !j.production_mode) {
    throw new HttpError(409, 'production_not_assigned', 'Choose in-house or dealer before signing this step');
  }
  next();
}));

// Finance sets the price on a quote request job.
partnerExtraRoutes.post('/jobs/:ref/quote-price', writeLimiter, asyncHandler(async (req, res) => {
  const ref = jobRef(req);
  const { priceKes } = parse(z.object({ priceKes: z.number().int().min(1).max(100000000) }), req.body);
  const workspace = workspaceOf(req);
  const out = await withTransaction(async (client) => {
    const j = await lockJob(client, ref, workspace);
    if (j.current_step !== 'finance_quote' || j.step_status !== 'active') {
      throw new HttpError(409, 'not_editable', 'The price can only be set before the first signature on the quote step');
    }
    const r = await client.query(
      `UPDATE quote_requests SET quoted_price_kes = $2, status = 'quoted'
        WHERE id = (SELECT quote_request_id FROM jobs WHERE id = $1) RETURNING ref`,
      [j.id, priceKes]
    );
    if (!r.rows[0]) throw new HttpError(400, 'not_a_quote', 'This job comes from an order, which already has a fixed price');
    return { quoteRef: r.rows[0].ref, covered: await actingFor(client, req, workspace) };
  });
  await audit(req, {
    action: 'quote.priced', entityType: 'quote_request', entityId: out.quoteRef,
    actorUserId: req.user.id, actingForUserId: out.covered, details: { job: ref, priceKes },
  });
  res.json({ ref, quoteRef: out.quoteRef, quotedPriceKes: priceKes });
}));

// Production chooses who makes it.
partnerExtraRoutes.post('/jobs/:ref/production', writeLimiter, asyncHandler(async (req, res) => {
  const ref = jobRef(req);
  const body = parse(z.object({ mode: z.enum(['in_house', 'dealer']), vendorCode: z.string().trim().min(2).max(30).optional() }), req.body);
  if (body.mode === 'dealer' && !body.vendorCode) throw new HttpError(400, 'vendor_required', 'Enter the dealer code');
  if (body.mode === 'dealer') {
    const dv = await query("SELECT code FROM vendors WHERE upper(code) = upper($1) AND status = 'active'", [body.vendorCode]);
    if (!dv.rows[0]) throw new HttpError(400, 'unknown_dealer', 'Unknown dealer code');
    body.vendorCode = dv.rows[0].code;
  }
  const vendor = body.mode === 'dealer' ? body.vendorCode : null;
  const workspace = workspaceOf(req);
  const covered = await withTransaction(async (client) => {
    const j = await lockJob(client, ref, workspace);
    if (j.current_step !== 'production' || j.step_status !== 'active') {
      throw new HttpError(409, 'not_editable', 'This can only be set before the first signature on the production step');
    }
    await client.query('UPDATE jobs SET production_mode = $2, vendor_code = $3, vendor_status = DEFAULT WHERE id = $1', [j.id, body.mode, vendor]);
    return actingFor(client, req, workspace);
  });
  await audit(req, {
    action: 'job.production_assigned', entityType: 'job', entityId: ref,
    actorUserId: req.user.id, actingForUserId: covered, details: { mode: body.mode, vendor },
  });
  res.json({ ref, productionMode: body.mode, vendorCode: vendor });
}));

// Live co-sign, step 1: the first signer asks another partner to approve from their own device.
partnerExtraRoutes.post('/jobs/:ref/cosign-request', writeLimiter, asyncHandler(async (req, res) => {
  const ref = jobRef(req);
  const { toStage } = parse(z.object({ toStage: z.enum(['creative', 'production', 'finance']) }), req.body);
  const workspace = workspaceOf(req);
  const out = await withTransaction(async (client) => {
    const j = await lockJob(client, ref, workspace);
    if (j.step_status !== 'awaiting_cosign') throw new HttpError(409, 'not_ready', 'This step is not waiting for a co-signature');
    const owner = await client.query(
      "SELECT partner_id FROM job_signatures WHERE job_id = $1 AND step = $2 AND role = 'owner' AND voided_at IS NULL",
      [j.id, j.current_step]
    );
    if (owner.rows[0].partner_id !== req.user.id) {
      throw new HttpError(403, 'not_first_signer', 'Only the first signer can ask for a live co-signature');
    }
    const target = await client.query(
      "SELECT id, full_name FROM users WHERE role = 'partner' AND partner_stage = $1 AND is_active AND id <> $2",
      [toStage, req.user.id]
    );
    if (!target.rows[0]) throw new HttpError(404, 'no_partner', 'No other active partner found for that stage');
    await client.query("UPDATE cosign_requests SET status = 'expired' WHERE job_id = $1 AND step = $2 AND status = 'pending'", [j.id, j.current_step]);
    const r = await client.query(
      'INSERT INTO cosign_requests (job_id, step, requested_by, requested_from) VALUES ($1, $2, $3, $4) RETURNING id, expires_at',
      [j.id, j.current_step, req.user.id, target.rows[0].id]
    );
    return { id: r.rows[0].id, expiresAt: r.rows[0].expires_at, to: target.rows[0].full_name, step: j.current_step };
  });
  await audit(req, { action: 'job.cosign_requested', entityType: 'job', entityId: ref, actorUserId: req.user.id, details: { step: out.step, toStage } });
  res.status(201).json({ requestId: out.id, expiresAt: out.expiresAt, to: out.to });
}));

// Step 2: the other partner sees pending requests in their own portal.
partnerExtraRoutes.get('/cosign-requests', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT r.id, j.ref AS "jobRef", r.step, u.full_name AS "requestedBy", r.created_at AS "createdAt", r.expires_at AS "expiresAt"
       FROM cosign_requests r
       JOIN jobs j ON j.id = r.job_id
       JOIN users u ON u.id = r.requested_by
      WHERE r.requested_from = $1 AND r.status = 'pending' AND r.expires_at > now() AND j.status = 'open'
      ORDER BY r.created_at`,
    [req.user.id]
  );
  res.json({ requests: rows });
}));

// Step 3: approve. This is the second signature, from their own signed-in device.
partnerExtraRoutes.post('/cosign-requests/:id/approve', writeLimiter, asyncHandler(async (req, res) => {
  const id = requestId(req);
  const first = (await query('SELECT job_id FROM cosign_requests WHERE id = $1 AND requested_from = $2', [id, req.user.id])).rows[0];
  if (!first) throw new HttpError(404, 'request_not_found', 'Request not found');

  const out = await withTransaction(async (client) => {
    const jr = await client.query('SELECT id, ref, status, current_step FROM jobs WHERE id = $1 FOR UPDATE', [first.job_id]);
    const job = jr.rows[0];
    const rq = (await client.query(
      'SELECT id, step, status, expires_at < now() AS expired FROM cosign_requests WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (rq.status !== 'pending') throw new HttpError(409, 'request_closed', 'This request is no longer pending');
    if (rq.expired) throw new HttpError(409, 'request_expired', 'This request has expired. Ask for a new one.');
    if (job.status !== 'open' || job.current_step !== rq.step) throw new HttpError(409, 'request_closed', 'This step has already moved on');
    const st = await client.query('SELECT status FROM job_steps WHERE job_id = $1 AND step = $2', [job.id, rq.step]);
    if (st.rows[0].status !== 'awaiting_cosign') throw new HttpError(409, 'not_ready', 'This step is not waiting for a co-signature');
    const owner = await client.query(
      "SELECT partner_id FROM job_signatures WHERE job_id = $1 AND step = $2 AND role = 'owner' AND voided_at IS NULL",
      [job.id, rq.step]
    );
    if (owner.rows[0].partner_id === req.user.id) throw new HttpError(409, 'same_person', 'The co-signer must be a different partner');
    try {
      await client.query(
        `INSERT INTO job_signatures (job_id, step, role, partner_id, signer_stage, workspace_stage, method)
         VALUES ($1, $2, 'cosigner', $3, $4, $5, 'live_approval')`,
        [job.id, rq.step, req.user.id, req.user.stage, STEP_STAGE[rq.step]]
      );
    } catch (err) {
      if (err.code === '23505') throw new HttpError(409, 'same_person', 'This partner has already signed this step');
      throw err;
    }
    await client.query("UPDATE job_steps SET status = 'signed_off', signed_off_at = now() WHERE job_id = $1 AND step = $2", [job.id, rq.step]);
    const idx = STEPS.indexOf(rq.step);
    let next = 'done';
    if (idx === STEPS.length - 1) {
      await client.query("UPDATE jobs SET status = 'complete', current_step = 'done', completed_at = now() WHERE id = $1", [job.id]);
    } else {
      next = STEPS[idx + 1];
      await client.query("UPDATE job_steps SET status = 'active' WHERE job_id = $1 AND step = $2", [job.id, next]);
      await client.query('UPDATE jobs SET current_step = $2 WHERE id = $1', [job.id, next]);
    }
    await client.query("UPDATE cosign_requests SET status = 'approved', decided_at = now() WHERE id = $1", [id]);
    return { ref: job.ref, step: rq.step, next, firstSigner: owner.rows[0].partner_id };
  });

  await audit(req, {
    action: 'job.cosigned', entityType: 'job', entityId: out.ref, actorUserId: req.user.id,
    details: { step: out.step, firstSigner: out.firstSigner, method: 'live_approval', next: out.next },
  });
  res.json({ ref: out.ref, step: out.step, stepStatus: 'signed_off', jobNow: out.next === 'done' ? 'complete' : out.next });
}));

partnerExtraRoutes.post('/cosign-requests/:id/decline', writeLimiter, asyncHandler(async (req, res) => {
  const id = requestId(req);
  const { rows } = await query(
    "UPDATE cosign_requests SET status = 'declined', decided_at = now() WHERE id = $1 AND requested_from = $2 AND status = 'pending' RETURNING job_id",
    [id, req.user.id]
  );
  if (!rows[0]) throw new HttpError(404, 'request_not_found', 'No pending request found');
  await audit(req, { action: 'job.cosign_declined', entityType: 'cosign_request', entityId: id, actorUserId: req.user.id });
  res.json({ ok: true });
}));
