import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { checkCsv, exportCsv } from '../csv/importer.js';

export const partnerCsvRoutes = Router();
const bodySchema = z.object({
  csv: z.string().min(10).max(900000),
  overwrite: z.boolean().default(false),
  fileName: z.string().trim().max(120).default('products.csv'),
});

partnerCsvRoutes.post('/csv/check', asyncHandler(async (req, res) => {
  const b = parse(bodySchema, req.body);
  const { items, ...rest } = await checkCsv(pool, b.csv, b.overwrite);
  res.json(rest);
}));

partnerCsvRoutes.post('/csv/submit', asyncHandler(async (req, res) => {
  const b = parse(bodySchema, req.body);
  const c = await checkCsv(pool, b.csv, b.overwrite);
  if (c.fatal || c.errors.length) throw new HttpError(400, 'csv_invalid', c.fatal || 'Fix the errors in the file first');
  const r = await pool.query(
    'INSERT INTO csv_import_batches (file_name, csv_text, overwrite_manager, rows_total, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [b.fileName, b.csv, b.overwrite, c.rows, req.user.id]);
  const id = String(r.rows[0].id);
  await audit(req, { action: 'catalog.csv_submitted', entityType: 'csv_batch', entityId: id, actorUserId: req.user.id, details: { file: b.fileName, rows: c.rows, create: c.create, update: c.update, skipped: c.skipped.length } });
  res.status(201).json({ batchId: id, create: c.create, update: c.update, skipped: c.skipped });
}));

partnerCsvRoutes.get('/csv/export', asyncHandler(async (req, res) => {
  const csv = await exportCsv(pool);
  await audit(req, { action: 'catalog.csv_exported', entityType: 'export', entityId: 'products', actorUserId: req.user.id, details: {} });
  res.json({ csv, fileName: 'pyfon-products-' + new Date().toISOString().slice(0, 10) + '.csv' });
}));
