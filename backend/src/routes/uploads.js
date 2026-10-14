import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { uploadsReady, checkFile, storeFile, removeFile, cleanName } from '../uploads/storage.js';

export const customerUploadRoutes = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: 'too_many_attempts', message: 'Too many uploads. Try again later.' } }),
});

const reader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 5, fieldSize: 1024 },
}).single('file');

export function receive(req, res) {
  return new Promise((resolve, reject) => {
    reader(req, res, (err) => {
      if (!err) return resolve();
      if (err.code === 'LIMIT_FILE_SIZE') return reject(new HttpError(413, 'file_too_large', 'File is too big (max 10 MB)'));
      reject(new HttpError(400, 'upload_failed', 'Could not read the upload'));
    });
  });
}

export const shapeAttachment = (r) => ({
  id: String(r.id), purpose: r.purpose, url: r.url,
  originalName: r.original_name, mimeType: r.mime_type, bytes: r.bytes,
});

const purposeSchema = z.object({ purpose: z.enum(['personalization', 'reference']) });

customerUploadRoutes.post('/uploads', limiter, asyncHandler(async (req, res) => {
  if (!uploadsReady()) throw new HttpError(503, 'uploads_unavailable', 'Uploads are not available right now');
  await receive(req, res);
  if (!req.file) throw new HttpError(400, 'file_missing', 'Attach one file in the "file" field');
  const { purpose } = parse(purposeSchema, { purpose: (req.body || {}).purpose });

  const info = await checkFile(req.file.buffer);
  const stored = await storeFile(req.file.buffer, info);

  let row;
  try {
    const ins = await pool.query(
      'INSERT INTO attachments (uploaded_by, purpose, public_id, url, original_name, mime_type, bytes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user.id, purpose, stored.publicId, stored.url, cleanName(req.file.originalname), stored.mime, stored.bytes]
    );
    row = ins.rows[0];
  } catch (err) {
    await removeFile(stored.publicId, stored.mime);
    throw err;
  }

  await audit(req, { action: 'upload.created', entityType: 'attachment', entityId: String(row.id), actorUserId: req.user.id, details: { purpose, mime: stored.mime, bytes: stored.bytes } });
  res.status(201).json({ attachment: shapeAttachment(row) });
}));

