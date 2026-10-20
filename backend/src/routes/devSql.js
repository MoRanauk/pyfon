import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';

// Developer desk, Tools group: SQL console. Read only, 5 second limit, 200 rows, secret columns hidden.
export const devSqlRoutes = Router();

const bodySchema = z.object({ sql: z.string().trim().min(1).max(4000) });
const DENY = /\b(password_hash|code_hash|password_resets|pg_read_file|pg_read_binary_file|pg_ls_dir|lo_import|lo_export|dblink|set_config|pg_sleep|pg_terminate_backend|pg_cancel_backend)\b|\bcopy\b/i;
const HIDE = /^(password_hash|code_hash|token|secret|api_key)$/i;

devSqlRoutes.post('/sql/run', asyncHandler(async (req, res) => {
  const { sql: raw } = parse(bodySchema, req.body);
  const sql = raw.replace(/;\s*$/, '');
  if (sql.includes(';')) throw new HttpError(400, 'one_statement', 'Only one statement at a time');
  if (/--|\/\*/.test(sql)) throw new HttpError(400, 'no_comments', 'Comments are not allowed');
  if (!/^(select|with)\b/i.test(sql)) throw new HttpError(400, 'select_only', 'Only SELECT queries are allowed');
  if (DENY.test(sql)) throw new HttpError(400, 'blocked_word', 'That query mentions something this console never shows');
  const started = Date.now();
  const client = await pool.connect();
  let r;
  try {
    await client.query('BEGIN READ ONLY');
    await client.query('SET LOCAL statement_timeout = 5000');
    r = await client.query('SELECT * FROM (' + sql + ') AS q LIMIT 201');
  } catch (e) {
    throw new HttpError(400, 'sql_error', String(e.message).slice(0, 300));
  } finally {
    try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    client.release();
  }
  const columns = r.fields.map((f) => f.name);
  const rows = r.rows.slice(0, 200).map((row) => columns.map((c) => (HIDE.test(c) ? '(hidden)' : row[c])));
  await audit(req, { action: 'security.sql_run', entityType: 'system', entityId: 'sql', actorUserId: req.user.id, details: { sql: sql.slice(0, 300), rows: rows.length } });
  res.json({ columns, rows, truncated: r.rows.length > 200, ms: Date.now() - started });
}));
