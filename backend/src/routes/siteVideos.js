import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { withTransaction } from '../db/tx.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { uploadsReady, checkVideo, storeVideo, removeVideo } from '../uploads/storage.js';

// Home-page video playlists, one per shop (up to 5, played one after another).
// Admin routes are mounted for partners (/v1/partner/videos) and the developer console (/v1/dev/videos).
// Replacing or removing a video archives it. Nothing is deleted from here.
export const siteVideoAdminRoutes = Router();
export const publicVideoRoutes = Router();

const MAX_ACTIVE = 5;
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: 'too_many_attempts', message: 'Too many changes. Try again later.' } }),
});

const reader = multer({ storage: multer.memoryStorage(), limits: { fileSize: 21 * 1024 * 1024, files: 1, fields: 6, fieldSize: 1024 } }).single('file');
function receiveVideo(req, res) {
  return new Promise((resolve, reject) => {
    reader(req, res, (err) => {
      if (!err) return resolve();
      if (err.code === 'LIMIT_FILE_SIZE') return reject(new HttpError(413, 'file_too_large', 'Video is too big (max 20 MB). Compress it or make it shorter.'));
      reject(new HttpError(400, 'upload_failed', 'Could not read the upload'));
    });
  });
}

const who = (req) => String(req.user.fullName || req.user.email || req.user.id).slice(0, 80);
const idParam = (req) => {
  if (!/^\d{1,18}$/.test(req.params.id)) throw new HttpError(404, 'video_not_found', 'Video not found');
  return req.params.id;
};
const posterOf = (url) => (url.includes('res.cloudinary.com') && /\.(mp4|webm)$/i.test(url) ? url.replace(/\.(mp4|webm)$/i, '.jpg') : null);
const titleSchema = z.string().trim().min(2).max(80);
const shopSchema = z.string().trim().min(1).max(20);
const linkSchema = z.object({
  url: z.string().trim().max(500).url().refine(
    (u) => u.startsWith('https://') && /\.(mp4|webm)(\?.*)?$/i.test(u),
    'Use a direct https link ending in .mp4 or .webm'
  ),
});

async function mustHaveShop(code) {
  const { rows } = await query('SELECT code FROM storefronts WHERE code = $1', [code]);
  if (!rows[0]) throw new HttpError(400, 'unknown_storefront', 'Unknown shop code. Use mco, prestige or trim');
}

// A video comes either as an uploaded file (stored on Cloudinary) or as a pasted https link.
async function takeVideo(req, res) {
  if (req.is('multipart/form-data')) {
    if (!uploadsReady()) throw new HttpError(503, 'uploads_unavailable', 'Uploads are not available right now');
    await receiveVideo(req, res);
    if (!req.file) throw new HttpError(400, 'file_missing', 'Attach one video in the "file" field');
    const info = await checkVideo(req.file.buffer);
    const stored = await storeVideo(req.file.buffer, info, 'pyfon/videos');
    return { url: stored.url, publicId: stored.publicId, poster: posterOf(stored.url) };
  }
  const b = parse(linkSchema, req.body || {});
  return { url: b.url, publicId: null, poster: posterOf(b.url) };
}

const shape = (r) => ({
  id: String(r.id), storefront: r.storefront_code, position: r.position, title: r.title, url: r.url, poster: r.poster_url,
  status: r.status, archivedAt: r.archived_at, archivedBy: r.archived_by, archiveReason: r.archive_reason,
});

siteVideoAdminRoutes.get('/', asyncHandler(async (req, res) => {
  const { storefront } = parse(z.object({ storefront: shopSchema }), req.query);
  const { rows } = await query('SELECT * FROM site_videos WHERE storefront_code = $1 ORDER BY position, id', [storefront]);
  const all = rows.map(shape);
  res.json({
    current: all.filter((v) => v.status === 'active'),
    archive: all.filter((v) => v.status !== 'active').sort((a, b) => new Date(b.archivedAt || 0) - new Date(a.archivedAt || 0)),
  });
}));

siteVideoAdminRoutes.post('/', limiter, asyncHandler(async (req, res) => {
  const got = await takeVideo(req, res);
  try {
    const f = parse(z.object({ title: titleSchema, storefront: shopSchema }), req.body || {});
    await mustHaveShop(f.storefront);
    const row = await withTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['site_videos_' + f.storefront]);
      const c = await client.query("SELECT coalesce(max(position), 0)::int AS p, count(*)::int AS n FROM site_videos WHERE storefront_code = $1 AND status = 'active'", [f.storefront]);
      if (c.rows[0].n >= MAX_ACTIVE) throw new HttpError(409, 'too_many_videos', 'A shop can have up to ' + MAX_ACTIVE + ' videos. Archive one first.');
      const ins = await client.query(
        'INSERT INTO site_videos (storefront_code, position, title, url, poster_url, public_id, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [f.storefront, c.rows[0].p + 1, f.title, got.url, got.poster, got.publicId, who(req)]
      );
      return ins.rows[0];
    });
    await audit(req, { action: 'video.added', entityType: 'site_video', entityId: String(row.id), actorUserId: req.user.id, details: { storefront: f.storefront, title: f.title, uploaded: Boolean(got.publicId) } });
    res.status(201).json({ video: shape(row) });
  } catch (err) {
    if (got.publicId) await removeVideo(got.publicId);
    throw err;
  }
}));

siteVideoAdminRoutes.put('/order', limiter, asyncHandler(async (req, res) => {
  const b = parse(z.object({ storefront: shopSchema, order: z.array(z.string().regex(/^\d{1,18}$/)).min(1).max(MAX_ACTIVE) }), req.body);
  await withTransaction(async (client) => {
    const cur = await client.query("SELECT id FROM site_videos WHERE storefront_code = $1 AND status = 'active' FOR UPDATE", [b.storefront]);
    const have = new Set(cur.rows.map((r) => String(r.id)));
    if (new Set(b.order).size !== b.order.length || b.order.length !== have.size || !b.order.every((id) => have.has(id))) {
      throw new HttpError(400, 'order_mismatch', 'Send every current video exactly once');
    }
    await client.query("UPDATE site_videos SET position = position + 1000 WHERE storefront_code = $1 AND status = 'active'", [b.storefront]);
    for (let i = 0; i < b.order.length; i++) {
      await client.query('UPDATE site_videos SET position = $1 WHERE id = $2 AND storefront_code = $3', [i + 1, b.order[i], b.storefront]);
    }
  });
  await audit(req, { action: 'video.reordered', entityType: 'site_video', entityId: b.storefront, actorUserId: req.user.id });
  res.json({ ok: true });
}));

siteVideoAdminRoutes.patch('/:id', limiter, asyncHandler(async (req, res) => {
  const id = idParam(req);
  const { title } = parse(z.object({ title: titleSchema }), req.body);
  const r = await query("UPDATE site_videos SET title = $2 WHERE id = $1 AND status = 'active' RETURNING id", [id, title]);
  if (!r.rows[0]) throw new HttpError(404, 'video_not_found', 'Video not found');
  res.json({ ok: true });
}));

siteVideoAdminRoutes.post('/:id/replace', limiter, asyncHandler(async (req, res) => {
  const id = idParam(req);
  const got = await takeVideo(req, res);
  try {
    const t = parse(z.object({ title: titleSchema.optional() }), req.body || {});
    const row = await withTransaction(async (client) => {
      const old = await client.query("SELECT * FROM site_videos WHERE id = $1 AND status = 'active' FOR UPDATE", [id]);
      if (!old.rows[0]) throw new HttpError(404, 'video_not_found', 'Video not found');
      await client.query("UPDATE site_videos SET status = 'archived', archived_at = now(), archived_by = $2, archive_reason = 'Replaced' WHERE id = $1", [id, who(req)]);
      const ins = await client.query(
        'INSERT INTO site_videos (storefront_code, position, title, url, poster_url, public_id, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [old.rows[0].storefront_code, old.rows[0].position, t.title || old.rows[0].title, got.url, got.poster, got.publicId, who(req)]
      );
      return ins.rows[0];
    });
    await audit(req, { action: 'video.replaced', entityType: 'site_video', entityId: id, actorUserId: req.user.id, details: { newVideoId: String(row.id) } });
    res.status(201).json({ video: shape(row) });
  } catch (err) {
    if (got.publicId) await removeVideo(got.publicId);
    throw err;
  }
}));

siteVideoAdminRoutes.post('/:id/archive', limiter, asyncHandler(async (req, res) => {
  const id = idParam(req);
  const { reason } = parse(z.object({ reason: z.string().trim().max(200).optional() }), req.body || {});
  const r = await query(
    "UPDATE site_videos SET status = 'archived', archived_at = now(), archived_by = $2, archive_reason = $3 WHERE id = $1 AND status = 'active' RETURNING id",
    [id, who(req), reason || 'Removed']
  );
  if (!r.rows[0]) throw new HttpError(404, 'video_not_found', 'Video not found');
  await audit(req, { action: 'video.archived', entityType: 'site_video', entityId: id, actorUserId: req.user.id, details: { reason: reason || null } });
  res.json({ ok: true });
}));

siteVideoAdminRoutes.post('/:id/restore', limiter, asyncHandler(async (req, res) => {
  const id = idParam(req);
  await withTransaction(async (client) => {
    const old = await client.query("SELECT storefront_code FROM site_videos WHERE id = $1 AND status = 'archived' FOR UPDATE", [id]);
    if (!old.rows[0]) throw new HttpError(404, 'video_not_found', 'Archived video not found');
    const shop = old.rows[0].storefront_code;
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['site_videos_' + shop]);
    const c = await client.query("SELECT coalesce(max(position), 0)::int AS p, count(*)::int AS n FROM site_videos WHERE storefront_code = $1 AND status = 'active'", [shop]);
    if (c.rows[0].n >= MAX_ACTIVE) throw new HttpError(409, 'too_many_videos', 'A shop can have up to ' + MAX_ACTIVE + ' videos. Archive one first.');
    await client.query("UPDATE site_videos SET status = 'active', position = $2, archived_at = NULL, archived_by = NULL, archive_reason = NULL WHERE id = $1", [id, c.rows[0].p + 1]);
  });
  await audit(req, { action: 'video.restored', entityType: 'site_video', entityId: id, actorUserId: req.user.id });
  res.json({ ok: true });
}));

// Public: the playlist a shop's home page plays.
publicVideoRoutes.get('/:storefront', asyncHandler(async (req, res) => {
  if (!/^[a-z0-9-]{1,20}$/.test(req.params.storefront)) throw new HttpError(404, 'not_found', 'Unknown shop');
  const { rows } = await query("SELECT id, title, url, poster_url FROM site_videos WHERE storefront_code = $1 AND status = 'active' ORDER BY position", [req.params.storefront]);
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ videos: rows.map((r) => ({ id: String(r.id), title: r.title, url: r.url, poster: r.poster_url })) });
}));
