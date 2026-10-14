import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { withTransaction } from '../db/tx.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';

export const customerFileRoutes = Router();

const MAX_PER_LINE = 3;
const MAX_PER_QUOTE = 5;

const linkLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const bodySchema = z.object({ attachmentId: z.coerce.number().int().positive() });

export function shapeFile(r) {
  return { id: r.id, purpose: r.purpose, url: r.url, originalName: r.original_name, mimeType: r.mime_type, bytes: r.bytes };
}

// Finds a file that belongs to this customer and is not linked anywhere yet.
async function takeFreeFile(client, attachmentId, userId, allowedPurposes) {
  const a = await client.query(
    `SELECT id, purpose, url, original_name, mime_type, bytes, order_line_id, quote_request_id, job_id
       FROM attachments WHERE id = $1 AND uploaded_by = $2 FOR UPDATE`,
    [attachmentId, userId]
  );
  if (!a.rows.length) throw new HttpError(404, 'file_not_found', 'File not found');
  const f = a.rows[0];
  if (f.order_line_id || f.quote_request_id || f.job_id) {
    throw new HttpError(409, 'already_linked', 'This file is already attached to something');
  }
  if (!allowedPurposes.includes(f.purpose)) {
    throw new HttpError(400, 'wrong_purpose', 'This file was uploaded for a different purpose');
  }
  return f;
}

function checkJobOpen(job) {
  if (job.status !== 'open') throw new HttpError(409, 'job_closed', 'This job is closed');
  if (job.current_step !== 'finance_quote') {
    throw new HttpError(409, 'too_late', 'Work has already started, so files can no longer be added');
  }
}

customerFileRoutes.post('/orders/:ref/lines/:lineId/files', linkLimiter, asyncHandler(async (req, res) => {
  const body = parse(bodySchema, req.body);
  const ref = String(req.params.ref).toUpperCase();
  const lineId = String(req.params.lineId);
  if (!/^ORD-\d+$/.test(ref) || !/^\d{1,15}$/.test(lineId)) throw new HttpError(404, 'not_found', 'Order line not found');

  const file = await withTransaction(async (client) => {
    const o = await client.query(
      `SELECT o.id, j.status, j.current_step
         FROM orders o JOIN jobs j ON j.order_id = o.id
        WHERE o.ref = $1 AND o.customer_id = $2
        FOR UPDATE OF j`,
      [ref, req.user.id]
    );
    if (!o.rows.length) throw new HttpError(404, 'not_found', 'Order not found');
    checkJobOpen(o.rows[0]);

    const l = await client.query(
      `SELECT ol.id, ci.personalization
         FROM order_lines ol LEFT JOIN catalog_items ci ON ci.id = ol.item_id
        WHERE ol.id = $1 AND ol.order_id = $2`,
      [lineId, o.rows[0].id]
    );
    if (!l.rows.length) throw new HttpError(404, 'not_found', 'Order line not found');
    const allowed = (l.rows[0].personalization || []).some((k) => k === 'logo' || k === 'photo');
    if (!allowed) throw new HttpError(400, 'personalization_not_allowed', 'This product does not accept a logo or photo');

    const f = await takeFreeFile(client, body.attachmentId, req.user.id, ['personalization']);

    const c = await client.query('SELECT count(*)::int AS n FROM attachments WHERE order_line_id = $1', [lineId]);
    if (c.rows[0].n >= MAX_PER_LINE) {
      throw new HttpError(409, 'too_many_files', 'At most ' + MAX_PER_LINE + ' files per order line');
    }

    await client.query('UPDATE attachments SET order_line_id = $1 WHERE id = $2', [lineId, f.id]);
    return f;
  });

  await audit(req, { action: 'upload.linked', entityType: 'attachment', entityId: String(file.id), actorUserId: req.user.id, details: { order: ref, lineId } });
  res.status(201).json({ file: shapeFile(file) });
}));

customerFileRoutes.post('/quote-requests/:ref/files', linkLimiter, asyncHandler(async (req, res) => {
  const body = parse(bodySchema, req.body);
  const ref = String(req.params.ref).toUpperCase();
  if (!/^QR-\d+$/.test(ref)) throw new HttpError(404, 'not_found', 'Quote request not found');

  const file = await withTransaction(async (client) => {
    const q = await client.query(
      `SELECT q.id, j.status, j.current_step
         FROM quote_requests q JOIN jobs j ON j.quote_request_id = q.id
        WHERE q.ref = $1 AND q.customer_id = $2
        FOR UPDATE OF j`,
      [ref, req.user.id]
    );
    if (!q.rows.length) throw new HttpError(404, 'not_found', 'Quote request not found');
    checkJobOpen(q.rows[0]);

    const f = await takeFreeFile(client, body.attachmentId, req.user.id, ['personalization', 'reference']);

    const c = await client.query('SELECT count(*)::int AS n FROM attachments WHERE quote_request_id = $1', [q.rows[0].id]);
    if (c.rows[0].n >= MAX_PER_QUOTE) {
      throw new HttpError(409, 'too_many_files', 'At most ' + MAX_PER_QUOTE + ' files per quote request');
    }

    await client.query('UPDATE attachments SET quote_request_id = $1 WHERE id = $2', [q.rows[0].id, f.id]);
    return f;
  });

  await audit(req, { action: 'upload.linked', entityType: 'attachment', entityId: String(file.id), actorUserId: req.user.id, details: { quote: ref } });
  res.status(201).json({ file: shapeFile(file) });
}));
