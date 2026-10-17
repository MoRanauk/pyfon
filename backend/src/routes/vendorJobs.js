import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';

// Dealer routes, mounted under /v1/vendor. A dealer sees only jobs assigned to their own dealer code.
// They never get the customer's phone, email, delivery address or free-text notes.
export const vendorJobRoutes = Router();

const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });
const ORDER = ['offered', 'accepted', 'in_progress', 'ready'];

async function myDealer(req) {
  const { rows } = await query('SELECT vendor_code FROM users WHERE id = $1', [req.user.id]);
  const code = rows[0] && rows[0].vendor_code;
  if (!code) throw new HttpError(403, 'no_dealer', 'This account is not linked to a dealer');
  return code;
}

function jobRef(req) {
  if (!/^JOB-\d{6,}$/.test(req.params.ref)) throw new HttpError(404, 'job_not_found', 'Job not found');
  return req.params.ref;
}

async function shape(j) {
  const base = { ref: j.ref, jobStatus: j.status, step: j.current_step, dealerStatus: j.vendor_status, createdAt: j.created_at };
  if (j.order_id) {
    const lines = await query('SELECT id, name, qty, options, personalization, design_name, design_url FROM order_lines WHERE order_id = $1 ORDER BY id', [j.order_id]);
    const ids = lines.rows.map((l) => l.id);
    const files = await query(
      'SELECT purpose, url, original_name, mime_type FROM attachments WHERE job_id = $1 OR order_line_id = ANY($2::bigint[]) ORDER BY id',
      [j.id, ids]
    );
    return {
      ...base,
      kind: 'order',
      items: lines.rows.map((l) => ({ name: l.name, qty: l.qty, options: l.options, personalization: l.personalization, design: l.design_name ? { name: l.design_name, url: l.design_url } : null })),
      files: files.rows
    };
  }
  const q = await query(
    `SELECT q.kind, q.quantity, q.spec, ci.name AS item_name
       FROM quote_requests q LEFT JOIN catalog_items ci ON ci.id = q.item_id WHERE q.id = $1`,
    [j.quote_request_id]
  );
  const files = await query(
    'SELECT purpose, url, original_name, mime_type FROM attachments WHERE job_id = $1 OR quote_request_id = $2 ORDER BY id',
    [j.id, j.quote_request_id]
  );
  const r = q.rows[0] || {};
  return { ...base, kind: 'quote', quoteKind: r.kind || null, item: r.item_name || null, quantity: r.quantity || null, spec: r.spec || {}, files: files.rows };
}

const MINE = `SELECT id, ref, status, current_step, vendor_status, created_at, order_id, quote_request_id
                FROM jobs WHERE vendor_code = $1 AND production_mode = 'dealer' AND status <> 'cancelled'`;

vendorJobRoutes.get('/jobs', asyncHandler(async (req, res) => {
  const code = await myDealer(req);
  const { rows } = await query(MINE + ' ORDER BY created_at DESC LIMIT 30', [code]);
  const jobs = [];
  for (const j of rows) jobs.push(await shape(j));
  res.json({ jobs });
}));

vendorJobRoutes.get('/jobs/:ref', asyncHandler(async (req, res) => {
  const code = await myDealer(req);
  const { rows } = await query(MINE + ' AND ref = $2', [code, jobRef(req)]);
  if (!rows[0]) throw new HttpError(404, 'job_not_found', 'Job not found');
  res.json({ job: await shape(rows[0]) });
}));

// Status moves one step at a time: offered -> accepted -> in_progress -> ready.
vendorJobRoutes.post('/jobs/:ref/status', writeLimiter, asyncHandler(async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['accepted', 'in_progress', 'ready']) }), req.body);
  const code = await myDealer(req);
  const { rows } = await query(MINE + ' AND ref = $2', [code, jobRef(req)]);
  const j = rows[0];
  if (!j) throw new HttpError(404, 'job_not_found', 'Job not found');
  if (j.status !== 'open' || j.current_step !== 'production') {
    throw new HttpError(409, 'not_in_production', 'This job is not in production right now');
  }
  const cur = ORDER.indexOf(j.vendor_status);
  if (ORDER.indexOf(status) !== cur + 1) {
    throw new HttpError(409, 'bad_status_step', cur >= ORDER.length - 1 ? 'This job is already marked ready' : 'The next status must be ' + ORDER[cur + 1]);
  }
  const upd = await query('UPDATE jobs SET vendor_status = $2 WHERE id = $1 AND vendor_status = $3 RETURNING id', [j.id, status, j.vendor_status]);
  if (!upd.rows[0]) throw new HttpError(409, 'changed', 'This job just changed. Refresh and try again.');
  await audit(req, {
    action: 'vendor.job_status', entityType: 'job', entityId: j.ref, actorUserId: req.user.id,
    details: { dealer: code, from: j.vendor_status, to: status }
  });
  res.json({ ref: j.ref, dealerStatus: status });
}));
