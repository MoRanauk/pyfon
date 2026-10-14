import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { uploadsReady, checkFile, storeFile, removeFile, cleanName } from '../uploads/storage.js';
import { receive, shapeAttachment } from './uploads.js';

export const partnerUploadRoutes = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: 'too_many_attempts', message: 'Too many uploads. Try again later.' } }),
});

function jobRef(req) {
  const ref = req.params.ref;
  if (!/^JOB-\d{6,}$/.test(ref)) throw new HttpError(404, 'job_not_found', 'Job not found');
  return ref;
}

const purposeSchema = z.object({ purpose: z.enum(['artwork', 'mockup', 'reference']) });

partnerUploadRoutes.post('/jobs/:ref/files', limiter, asyncHandler(async (req, res) => {
  const ref = jobRef(req);
  if (!uploadsReady()) throw new HttpError(503, 'uploads_unavailable', 'Uploads are not available right now');
  await receive(req, res);
  if (!req.file) throw new HttpError(400, 'file_missing', 'Attach one file in the "file" field');
  const { purpose } = parse(purposeSchema, { purpose: (req.body || {}).purpose });

  const jobRes = await pool.query('SELECT id, status FROM jobs WHERE ref = $1', [ref]);
  const job = jobRes.rows[0];
  if (!job) throw new HttpError(404, 'job_not_found', 'Job not found');
  if (job.status !== 'open') throw new HttpError(409, 'job_closed', 'This job is ' + job.status + ', files can no longer be added');

  const info = await checkFile(req.file.buffer);
  const stored = await storeFile(req.file.buffer, info);

  let row;
  try {
    const ins = await pool.query(
      'INSERT INTO attachments (uploaded_by, purpose, job_id, public_id, url, original_name, mime_type, bytes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [req.user.id, purpose, job.id, stored.publicId, stored.url, cleanName(req.file.originalname), stored.mime, stored.bytes]
    );
    row = ins.rows[0];
  } catch (err) {
    await removeFile(stored.publicId, stored.mime);
    throw err;
  }

  await audit(req, { action: 'job.file_added', entityType: 'job', entityId: ref, actorUserId: req.user.id, details: { attachmentId: String(row.id), purpose, mime: stored.mime, bytes: stored.bytes } });
  res.status(201).json({ attachment: shapeAttachment(row) });
}));

partnerUploadRoutes.get('/jobs/:ref/files', asyncHandler(async (req, res) => {
  const ref = jobRef(req);
  const jobRes = await pool.query('SELECT id, order_id, quote_request_id FROM jobs WHERE ref = $1', [ref]);
  const job = jobRes.rows[0];
  if (!job) throw new HttpError(404, 'job_not_found', 'Job not found');

  const { rows } = await pool.query(
    `SELECT a.*, (a.job_id IS NULL) AS from_customer FROM attachments a
     WHERE a.job_id = $1
        OR a.quote_request_id = $3
        OR a.order_line_id IN (SELECT id FROM order_lines WHERE order_id = $2)
     ORDER BY a.id`,
    [job.id, job.order_id, job.quote_request_id]
  );
  res.json({
    files: rows.map((r) => ({
      ...shapeAttachment(r),
      source: r.from_customer ? 'customer' : 'partner',
      uploadedBy: String(r.uploaded_by),
      orderLineId: r.order_line_id ? String(r.order_line_id) : null,
      createdAt: r.created_at,
    })),
  });
}));
