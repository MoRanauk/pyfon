import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { authenticate } from '../middleware/auth.js';

export const reviewRoutes = Router();
const STORES = ['mco', 'prestige', 'trim'];

function staff(req, res, next) {
  if (!req.user || !['partner', 'developer'].includes(req.user.role)) {
    throw new HttpError(403, 'forbidden', 'Not allowed');
  }
  next();
}

function shortName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Customer';
  if (parts.length === 1) return parts[0].slice(0, 30);
  return parts[0].slice(0, 30) + ' ' + parts[parts.length - 1][0].toUpperCase() + '.';
}

// ---- staff routes (declared first so /admin is not read as a store) ----
reviewRoutes.get('/admin', authenticate, staff, asyncHandler(async (req, res) => {
  const status = ['pending', 'published', 'hidden'].includes(req.query.status) ? req.query.status : null;
  const store = STORES.includes(req.query.store) ? req.query.store : null;
  const r = await query(
    `SELECT r.id, r.storefront, r.sku, c.name AS item_name, r.display_name, r.rating,
            r.body, r.edited_body, r.verified, r.status, r.created_at, r.published_at
       FROM reviews r LEFT JOIN catalog_items c ON c.sku = r.sku
      WHERE ($1::text IS NULL OR r.status = $1) AND ($2::text IS NULL OR r.storefront = $2)
      ORDER BY r.created_at DESC LIMIT 200`,
    [status, store]
  );
  res.json({
    reviews: r.rows.map((x) => ({
      id: x.id, store: x.storefront, sku: x.sku, item: x.item_name || null,
      name: x.display_name, rating: x.rating, body: x.body, editedBody: x.edited_body,
      verified: x.verified, status: x.status, createdAt: x.created_at, publishedAt: x.published_at,
    })),
  });
}));

const patchSchema = z.object({
  status: z.enum(['pending', 'published', 'hidden']).optional(),
  body: z.string().trim().min(1).max(800).optional(),
});

reviewRoutes.patch('/admin/:id', authenticate, staff, asyncHandler(async (req, res) => {
  const data = parse(patchSchema, req.body);
  if (!data.status && !data.body) throw new HttpError(400, 'nothing', 'Nothing to change');
  const r = await query(
    `UPDATE reviews SET
        edited_body = COALESCE($2::text, edited_body),
        status = COALESCE($3::text, status),
        handled_by = $4,
        published_at = CASE WHEN $3::text = 'published' AND published_at IS NULL THEN now() ELSE published_at END
      WHERE id = $1 RETURNING id, status`,
    [req.params.id, data.body || null, data.status || null, req.user.id]
  );
  if (!r.rows[0]) throw new HttpError(404, 'not_found', 'Review not found');
  await audit(req, {
    action: 'review.update', entityType: 'review', entityId: req.params.id,
    actorUserId: req.user.id, details: { status: data.status || null, edited: Boolean(data.body) },
  });
  res.json({ ok: true, status: r.rows[0].status });
}));

// ---- customer: send a review (goes to pending) ----
const postSchema = z.object({
  storefront: z.enum(['mco', 'prestige', 'trim']),
  sku: z.string().trim().max(60).optional(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(800),
});

reviewRoutes.post('/', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'customer') throw new HttpError(403, 'forbidden', 'Only customers can write reviews');
  const d = parse(postSchema, req.body);
  const sku = d.sku || null;
  const recent = await query(
    `SELECT count(*)::int AS n FROM reviews WHERE user_id = $1 AND created_at > now() - interval '1 hour'`,
    [req.user.id]
  );
  if (recent.rows[0].n >= 3) throw new HttpError(429, 'too_many', 'Please wait a little before sending another review');
  const dup = await query(
    `SELECT 1 FROM reviews WHERE user_id = $1 AND storefront = $2 AND sku IS NOT DISTINCT FROM $3 AND status <> 'hidden' LIMIT 1`,
    [req.user.id, d.storefront, sku]
  );
  if (dup.rows[0]) throw new HttpError(409, 'duplicate', 'You have already reviewed this');
  let verified = false;
  if (sku) {
    try {
      const v = await query(
        `SELECT 1 FROM orders o JOIN order_lines l ON l.order_id = o.id
          WHERE o.customer_id = $1 AND l.sku = $2 LIMIT 1`,
        [req.user.id, sku]
      );
      verified = Boolean(v.rows[0]);
    } catch (e) {
      verified = false;
    }
  }
  const r = await query(
    `INSERT INTO reviews (storefront, sku, user_id, display_name, rating, body, verified)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [d.storefront, sku, req.user.id, shortName(req.user.fullName), d.rating, d.body, verified]
  );
  await audit(req, {
    action: 'review.submit', entityType: 'review', entityId: r.rows[0].id,
    actorUserId: req.user.id, details: { store: d.storefront, sku },
  });
  res.status(201).json({ ok: true, message: 'Thank you! Your review will appear after our team checks it.' });
}));

// ---- public: published reviews ----
reviewRoutes.get('/:store', asyncHandler(async (req, res) => {
  if (!STORES.includes(req.params.store)) throw new HttpError(404, 'not_found', 'Unknown shop');
  const sku = req.query.sku ? String(req.query.sku).slice(0, 60) : null;
  const r = await query(
    `SELECT id, display_name, rating, COALESCE(edited_body, body) AS text, sku, verified, published_at
       FROM reviews
      WHERE storefront = $1 AND status = 'published' AND ($2::text IS NULL OR sku = $2)
      ORDER BY published_at DESC NULLS LAST LIMIT 40`,
    [req.params.store, sku]
  );
  const s = await query(
    `SELECT count(*)::int AS n, COALESCE(round(avg(rating), 1), 0)::float AS avg
       FROM reviews WHERE storefront = $1 AND status = 'published' AND ($2::text IS NULL OR sku = $2)`,
    [req.params.store, sku]
  );
  res.set('Cache-Control', 'public, max-age=30');
  res.json({
    reviews: r.rows.map((x) => ({
      id: x.id, name: x.display_name, rating: x.rating, body: x.text,
      sku: x.sku, verified: x.verified, date: x.published_at,
    })),
    summary: { count: s.rows[0].n, avg: s.rows[0].avg },
  });
}));
