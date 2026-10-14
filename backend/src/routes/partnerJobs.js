import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { STEPS } from '../jobs/createJob.js';
import { workspaceOf, stepsOfStage, ownerSignOff, coSign, rejectStep } from '../jobs/workflow.js';

export const partnerJobRoutes = Router();

const tooMany = (req, res) =>
  res.status(429).json({ error: { code: 'too_many_attempts', message: 'Too many attempts. Try again later.' } });
const signLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false, handler: tooMany });
const cosignLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, handler: tooMany });

const cosignSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(128),
});
const rejectSchema = z.object({
  reason: z.string().trim().min(3).max(500),
  sendBackTo: z.enum(STEPS).optional(),
});

function jobRef(req) {
  const ref = req.params.ref;
  if (!/^JOB-\d{6,}$/.test(ref)) throw new HttpError(404, 'job_not_found', 'Job not found');
  return ref;
}

// The queue for the workspace this partner is standing in.
partnerJobRoutes.get('/workspace', asyncHandler(async (req, res) => {
  const workspace = workspaceOf(req);
  const { rows } = await query(
    `SELECT j.ref, j.current_step AS "currentStep", js.status AS "stepStatus", j.created_at AS "createdAt",
            o.ref AS "orderRef", o.total_kes AS "totalKes", q.ref AS "quoteRef", q.kind AS "quoteKind",
            u.full_name AS "firstSigner"
       FROM jobs j
       JOIN job_steps js ON js.job_id = j.id AND js.step = j.current_step
       LEFT JOIN orders o ON o.id = j.order_id
       LEFT JOIN quote_requests q ON q.id = j.quote_request_id
       LEFT JOIN job_signatures s ON s.job_id = j.id AND s.step = j.current_step AND s.role = 'owner' AND s.voided_at IS NULL
       LEFT JOIN users u ON u.id = s.partner_id
      WHERE j.status = 'open' AND j.current_step = ANY($1)
      ORDER BY j.created_at`,
    [stepsOfStage(workspace)]
  );
  res.json({ workspace, covering: req.user.stage !== workspace, jobs: rows });
}));

// Full detail of any job. Every partner can read any job, so they can cover for each other.
partnerJobRoutes.get('/jobs/:ref', asyncHandler(async (req, res) => {
  const ref = jobRef(req);
  const j = (await query(
    `SELECT id, ref, status, current_step AS "currentStep", production_mode AS "productionMode", vendor_code AS "vendorCode",
            created_at AS "createdAt", order_id, quote_request_id FROM jobs WHERE ref = $1`, [ref])).rows[0];
  if (!j) throw new HttpError(404, 'job_not_found', 'Job not found');

  const steps = (await query(
    'SELECT step, position, status, signed_off_at AS "signedOffAt" FROM job_steps WHERE job_id = $1 ORDER BY position', [j.id])).rows;
  const signatures = (await query(
    `SELECT s.step, s.role, s.method, s.signed_at AS "signedAt", s.signer_stage AS "signerStage",
            s.workspace_stage AS "workspaceStage", u.full_name AS "partnerName"
       FROM job_signatures s JOIN users u ON u.id = s.partner_id
      WHERE s.job_id = $1 AND s.voided_at IS NULL ORDER BY s.signed_at`, [j.id])).rows;
  const rejections = (await query(
    `SELECT r.step, r.reason, r.send_back_to AS "sentBackTo", r.created_at AS "createdAt", u.full_name AS "rejectedBy"
       FROM job_rejections r JOIN users u ON u.id = r.rejected_by WHERE r.job_id = $1 ORDER BY r.created_at DESC`, [j.id])).rows;

  let order = null;
  let quote = null;
  if (j.order_id) {
    order = (await query(
      `SELECT ref, total_kes AS "totalKes", contact_name AS "contactName", contact_phone AS "contactPhone",
              contact_email AS "contactEmail", delivery_notes AS "deliveryNotes", created_at AS "createdAt"
         FROM orders WHERE id = $1`, [j.order_id])).rows[0];
    order.lines = (await query(
      `SELECT sku, name, qty, unit_price_kes AS "unitPriceKes", options, personalization
         FROM order_lines WHERE order_id = $1 ORDER BY id`, [j.order_id])).rows;
  }
  if (j.quote_request_id) {
    quote = (await query(
      `SELECT ref, kind, status, spec, quantity, company_name AS "companyName", contact_name AS "contactName",
              contact_phone AS "contactPhone", contact_email AS "contactEmail", notes, quoted_price_kes AS "quotedPriceKes"
         FROM quote_requests WHERE id = $1`, [j.quote_request_id])).rows[0];
  }
  const { id, order_id, quote_request_id, ...job } = j;
  res.json({ job, steps, signatures, rejections, order, quote });
}));

partnerJobRoutes.post('/jobs/:ref/sign-off', signLimiter, asyncHandler(async (req, res) => {
  res.json(await ownerSignOff(req, jobRef(req)));
}));

partnerJobRoutes.post('/jobs/:ref/cosign', cosignLimiter, asyncHandler(async (req, res) => {
  const body = parse(cosignSchema, req.body);
  res.json(await coSign(req, jobRef(req), body));
}));

partnerJobRoutes.post('/jobs/:ref/reject', signLimiter, asyncHandler(async (req, res) => {
  const body = parse(rejectSchema, req.body);
  res.json(await rejectStep(req, jobRef(req), body));
}));
