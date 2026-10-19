import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';

export const partnerMessageRoutes = Router();
const me = (req) => req.user.id || req.user.sub;
const idSchema = z.object({ id: z.string().uuid() });
const sendSchema = z.object({
  to: z.union([z.string().uuid(), z.literal('all')]),
  kind: z.enum(['text', 'sticker', 'file']).default('text'),
  body: z.string().trim().max(2000).default(''),
  file: z.object({ url: z.string().url().max(1000), name: z.string().trim().max(200), type: z.string().max(100).default('') }).optional(),
});
const COLS = 'm.id, m.from_user_id, m.kind, m.body, m.file_url, m.file_name, m.file_type, m.created_at, u.full_name AS sender';
const shape = (m, uid) => ({
  id: String(m.id), mine: String(m.from_user_id) === String(uid), from: m.sender, kind: m.kind, body: m.body, at: m.created_at,
  file: m.file_url ? { url: m.file_url, name: m.file_name, type: m.file_type } : null,
});

async function needPartner(id) {
  const r = await pool.query("SELECT id, full_name FROM users WHERE id = $1 AND role = 'partner'", [id]);
  if (!r.rows.length) throw new HttpError(404, 'not_found', 'That partner was not found');
  return r.rows[0];
}

partnerMessageRoutes.get('/messages/upload-sign', asyncHandler(async (req, res) => {
  const raw = process.env.CLOUDINARY_URL;
  if (!raw) throw new HttpError(503, 'no_storage', 'File storage is not set up');
  const u = new URL(raw);
  const secret = decodeURIComponent(u.password);
  const folder = 'pyfon/partner-chat';
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHash('sha1').update('folder=' + folder + '&timestamp=' + timestamp + secret).digest('hex');
  res.json({ cloudName: u.hostname, apiKey: decodeURIComponent(u.username), timestamp, folder, signature });
}));

partnerMessageRoutes.get('/messages/people', asyncHandler(async (req, res) => {
  const uid = me(req);
  const r = await pool.query(
    `SELECT u.id, u.full_name,
      (SELECT count(*)::int FROM partner_messages m WHERE m.from_user_id = u.id AND m.to_user_id = $1 AND m.read_at IS NULL) AS unread
     FROM users u WHERE u.role = 'partner' AND u.id <> $1 ORDER BY u.full_name`, [uid]);
  const g = await pool.query(
    'SELECT count(*)::int AS n FROM partner_messages WHERE to_user_id IS NULL AND from_user_id <> $1 AND id > COALESCE((SELECT last_id FROM partner_group_reads WHERE user_id = $1), 0)', [uid]);
  res.json({ groupUnread: g.rows[0].n, people: r.rows.map((x) => ({ id: String(x.id), name: x.full_name, unread: x.unread })) });
}));

partnerMessageRoutes.get('/messages/group', asyncHandler(async (req, res) => {
  const uid = me(req);
  await pool.query(
    'INSERT INTO partner_group_reads (user_id, last_id) SELECT $1, COALESCE(max(id), 0) FROM partner_messages WHERE to_user_id IS NULL ON CONFLICT (user_id) DO UPDATE SET last_id = EXCLUDED.last_id', [uid]);
  const r = await pool.query(
    'SELECT ' + COLS + ' FROM partner_messages m JOIN users u ON u.id = m.from_user_id WHERE m.to_user_id IS NULL ORDER BY m.id DESC LIMIT 200');
  res.json({ messages: r.rows.reverse().map((m) => shape(m, uid)) });
}));

partnerMessageRoutes.get('/messages/with/:id', asyncHandler(async (req, res) => {
  const { id } = parse(idSchema, req.params);
  await needPartner(id);
  const uid = me(req);
  await pool.query('UPDATE partner_messages SET read_at = now() WHERE from_user_id = $1 AND to_user_id = $2 AND read_at IS NULL', [id, uid]);
  const r = await pool.query(
    'SELECT ' + COLS + ' FROM partner_messages m JOIN users u ON u.id = m.from_user_id WHERE m.to_user_id IS NOT NULL AND ((m.from_user_id = $1 AND m.to_user_id = $2) OR (m.from_user_id = $2 AND m.to_user_id = $1)) ORDER BY m.id DESC LIMIT 200', [uid, id]);
  res.json({ messages: r.rows.reverse().map((m) => shape(m, uid)) });
}));

partnerMessageRoutes.post('/messages', asyncHandler(async (req, res) => {
  const b = parse(sendSchema, req.body);
  const uid = me(req);
  if (b.kind === 'file') {
    if (!b.file || !b.file.url.startsWith('https://res.cloudinary.com/')) throw new HttpError(400, 'bad_request', 'That file link is not allowed');
  } else if (!b.body) throw new HttpError(400, 'bad_request', 'Write a message first');
  let to = null;
  if (b.to !== 'all') {
    if (String(b.to) === String(uid)) throw new HttpError(400, 'bad_request', 'You cannot message yourself');
    await needPartner(b.to);
    to = b.to;
  }
  const f = b.kind === 'file' ? b.file : {};
  const r = await pool.query(
    'INSERT INTO partner_messages (from_user_id, to_user_id, kind, body, file_url, file_name, file_type) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
    [uid, to, b.kind, b.body, f.url || null, f.name || null, f.type || null]);
  res.status(201).json({ ok: true, id: String(r.rows[0].id) });
}));
