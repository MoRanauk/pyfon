import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { authenticate } from '../middleware/auth.js';
import { uploadsReady, checkFile, storeFile, removeFile } from '../uploads/storage.js';

// Pictures for the M3 Labs sign-in page (slideshow and advert) and for the shops' photo spaces.
// Public reads: /v1/media/login and /v1/media/site/:shop. Changes need a signed-in developer (partners too for shop photos).
export const mediaRoutes = Router();

const SLOTS = {
  prestige: ['hero-her', 'hero-him', 'feature'],
  trim: ['slide-1', 'slide-2', 'slide-3', 'diff'],
};
const MAX_SLIDES = 12;
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: 'too_many_attempts', message: 'Too many changes. Try again later.' } }),
});
const reader = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024, files: 1, fields: 8, fieldSize: 2048 } }).single('file');
function receive(req, res) {
  return new Promise((resolve, reject) => {
    reader(req, res, (err) => {
      if (!err) return resolve();
      if (err.code === 'LIMIT_FILE_SIZE') return reject(new HttpError(413, 'file_too_large', 'Picture is too big (max 5 MB).'));
      reject(new HttpError(400, 'upload_failed', 'Could not read the upload'));
    });
  });
}
const who = (req) => String(req.user.fullName || req.user.email || req.user.id).slice(0, 80);
const staff = (...roles) => [authenticate, (req, res, next) => (req.user && roles.includes(req.user.role) ? next() : next(new HttpError(403, 'forbidden', 'This is not available to your account')))];
const dev = staff('developer');
const both = staff('developer', 'partner');
const optimise = (u) => (/^https:\/\/res\.cloudinary\.com\//.test(u) ? u.replace('/upload/', '/upload/f_auto,q_auto,w_2000,c_limit/') : u);
async function storePicture(req, folder) {
  if (!uploadsReady()) throw new HttpError(503, 'uploads_unavailable', 'Uploads are not available right now');
  const info = await checkFile(req.file.buffer);
  if (info.raw) throw new HttpError(415, 'images_only', 'Only PNG, JPG or WebP pictures are allowed');
  const stored = await storeFile(req.file.buffer, info, folder);
  return { url: optimise(stored.url), publicId: stored.publicId };
}
const dropPicture = (publicId) => (publicId ? removeFile(publicId, 'image/jpeg') : null);
const idParam = (req) => {
  if (!/^\d{1,18}$/.test(req.params.id)) throw new HttpError(404, 'not_found', 'Not found');
  return req.params.id;
};
const linkOk = (u) => u === '' || /^https:\/\//.test(u);

// ---------- public ----------
mediaRoutes.get('/login', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id, kind, image_url, caption, title, body, link FROM login_gallery WHERE active ORDER BY position, id');
  const slides = rows.filter((r) => r.kind === 'image' && r.image_url).map((r) => ({ id: String(r.id), url: r.image_url, caption: r.caption }));
  const ads = rows.filter((r) => r.kind === 'advert');
  const a = ads.length ? ads[ads.length - 1] : null;
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ slides, advert: a ? { title: a.title, body: a.body, link: a.link, image: a.image_url } : null });
}));

mediaRoutes.get('/site/:store', asyncHandler(async (req, res) => {
  if (!/^[a-z0-9-]{1,20}$/.test(req.params.store)) throw new HttpError(404, 'not_found', 'Unknown shop');
  const { rows } = await query('SELECT slot, url FROM site_images WHERE storefront = $1', [req.params.store]);
  const images = {};
  for (const r of rows) images[r.slot] = r.url;
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ images });
}));

// ---------- developer: sign-in gallery ----------
mediaRoutes.get('/admin/login', ...dev, asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM login_gallery ORDER BY kind, position, id');
  res.json({ items: rows.map((r) => ({ id: String(r.id), kind: r.kind, url: r.image_url, caption: r.caption, title: r.title, body: r.body, link: r.link, active: r.active, position: r.position, createdBy: r.created_by })) });
}));

const addSchema = z.object({
  kind: z.enum(['image', 'advert']),
  caption: z.string().trim().max(120).default(''),
  title: z.string().trim().max(80).default(''),
  body: z.string().trim().max(300).default(''),
  link: z.string().trim().max(300).refine(linkOk, 'A link must start with https://').default(''),
});

mediaRoutes.post('/admin/login', ...dev, limiter, asyncHandler(async (req, res) => {
  await receive(req, res);
  const b = parse(addSchema, req.body || {});
  if (b.kind === 'image' && !req.file) throw new HttpError(400, 'file_missing', 'Choose a picture first');
  if (b.kind === 'advert' && !b.title && !b.body) throw new HttpError(400, 'bad_request', 'Write a title or a message for the advert');
  const pic = req.file ? await storePicture(req, 'pyfon/gallery') : null;
  let id;
  try {
    let pos = 0;
    if (b.kind === 'image') {
      const c = await query("SELECT count(*)::int AS n, coalesce(max(position), 0)::int AS p FROM login_gallery WHERE kind = 'image'");
      if (c.rows[0].n >= MAX_SLIDES) throw new HttpError(409, 'too_many', 'The gallery can hold ' + MAX_SLIDES + ' pictures. Remove one first.');
      pos = c.rows[0].p + 1;
    }
    const ins = await query(
      'INSERT INTO login_gallery (kind, image_url, public_id, caption, title, body, link, position, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
      [b.kind, pic ? pic.url : null, pic ? pic.publicId : null, b.caption, b.title, b.body, b.link, pos, who(req)]
    );
    id = String(ins.rows[0].id);
  } catch (err) {
    await dropPicture(pic && pic.publicId);
    throw err;
  }
  await audit(req, { action: 'login_gallery.added', entityType: 'login_gallery', entityId: id, actorUserId: req.user.id, details: { kind: b.kind } });
  res.status(201).json({ id });
}));

const patchSchema = z.object({
  caption: z.string().trim().max(120).optional(),
  title: z.string().trim().max(80).optional(),
  body: z.string().trim().max(300).optional(),
  link: z.string().trim().max(300).refine(linkOk, 'A link must start with https://').optional(),
  active: z.boolean().optional(),
});
const orNull = (v) => (v === undefined ? null : v);

mediaRoutes.patch('/admin/login/:id', ...dev, limiter, asyncHandler(async (req, res) => {
  const id = idParam(req);
  const b = parse(patchSchema, req.body || {});
  const r = await query(
    'UPDATE login_gallery SET caption = COALESCE($2, caption), title = COALESCE($3, title), body = COALESCE($4, body), link = COALESCE($5, link), active = COALESCE($6, active) WHERE id = $1 RETURNING id',
    [id, orNull(b.caption), orNull(b.title), orNull(b.body), orNull(b.link), orNull(b.active)]
  );
  if (!r.rows[0]) throw new HttpError(404, 'not_found', 'Not found');
  await audit(req, { action: 'login_gallery.changed', entityType: 'login_gallery', entityId: id, actorUserId: req.user.id });
  res.json({ ok: true });
}));

mediaRoutes.delete('/admin/login/:id', ...dev, limiter, asyncHandler(async (req, res) => {
  const id = idParam(req);
  const r = await query('DELETE FROM login_gallery WHERE id = $1 RETURNING public_id', [id]);
  if (!r.rows[0]) throw new HttpError(404, 'not_found', 'Not found');
  await dropPicture(r.rows[0].public_id);
  await audit(req, { action: 'login_gallery.removed', entityType: 'login_gallery', entityId: id, actorUserId: req.user.id });
  res.json({ ok: true });
}));

mediaRoutes.put('/admin/login-order', ...dev, limiter, asyncHandler(async (req, res) => {
  const b = parse(z.object({ order: z.array(z.string().regex(/^\d{1,18}$/)).min(1).max(MAX_SLIDES) }), req.body);
  for (let i = 0; i < b.order.length; i++) {
    await query("UPDATE login_gallery SET position = $1 WHERE id = $2 AND kind = 'image'", [i + 1, b.order[i]]);
  }
  await audit(req, { action: 'login_gallery.reordered', entityType: 'login_gallery', entityId: 'order', actorUserId: req.user.id });
  res.json({ ok: true });
}));

// ---------- developer and partners: shop photo spaces ----------
function slotsOf(store) {
  const s = SLOTS[store];
  if (!s) throw new HttpError(404, 'not_found', 'Unknown shop');
  return s;
}

mediaRoutes.get('/admin/site/:store', ...both, asyncHandler(async (req, res) => {
  const slots = slotsOf(req.params.store);
  const { rows } = await query('SELECT slot, url, alt FROM site_images WHERE storefront = $1', [req.params.store]);
  const images = {};
  for (const r of rows) images[r.slot] = { url: r.url, alt: r.alt };
  res.json({ slots, images });
}));

mediaRoutes.put('/admin/site/:store/:slot', ...both, limiter, asyncHandler(async (req, res) => {
  const store = req.params.store;
  const slot = req.params.slot;
  if (!slotsOf(store).includes(slot)) throw new HttpError(404, 'not_found', 'Unknown photo space');
  await receive(req, res);
  if (!req.file) throw new HttpError(400, 'file_missing', 'Choose a picture first');
  const alt = String((req.body && req.body.alt) || '').trim().slice(0, 120);
  const pic = await storePicture(req, 'pyfon/site');
  let oldId = null;
  try {
    const old = await query('SELECT public_id FROM site_images WHERE storefront = $1 AND slot = $2', [store, slot]);
    oldId = old.rows[0] ? old.rows[0].public_id : null;
    await query(
      'INSERT INTO site_images (storefront, slot, url, public_id, alt, updated_by, updated_at) VALUES ($1, $2, $3, $4, $5, $6, now()) ON CONFLICT (storefront, slot) DO UPDATE SET url = EXCLUDED.url, public_id = EXCLUDED.public_id, alt = EXCLUDED.alt, updated_by = EXCLUDED.updated_by, updated_at = now()',
      [store, slot, pic.url, pic.publicId, alt, who(req)]
    );
  } catch (err) {
    await dropPicture(pic.publicId);
    throw err;
  }
  await dropPicture(oldId);
  await audit(req, { action: 'site_image.set', entityType: 'site_image', entityId: store + '/' + slot, actorUserId: req.user.id });
  res.json({ ok: true, url: pic.url });
}));

mediaRoutes.delete('/admin/site/:store/:slot', ...both, limiter, asyncHandler(async (req, res) => {
  const store = req.params.store;
  const slot = req.params.slot;
  if (!slotsOf(store).includes(slot)) throw new HttpError(404, 'not_found', 'Unknown photo space');
  const r = await query('DELETE FROM site_images WHERE storefront = $1 AND slot = $2 RETURNING public_id', [store, slot]);
  if (r.rows[0]) await dropPicture(r.rows[0].public_id);
  await audit(req, { action: 'site_image.removed', entityType: 'site_image', entityId: store + '/' + slot, actorUserId: req.user.id });
  res.json({ ok: true });
}));
