import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { STORES, PLATFORMS, cleanSocialUrl } from '../socialLinks.js';

// M3 Labs: partners and the developer paste or remove a shop's social links.
export const partnerSocialRoutes = Router();

partnerSocialRoutes.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id, store, platform, url, updated_at FROM social_links ORDER BY store, platform');
  res.json({ stores: STORES, platforms: PLATFORMS, links: rows.map((r) => ({ id: String(r.id), store: r.store, platform: r.platform, url: r.url, updatedAt: r.updated_at })) });
}));

const putSchema = z.object({
  store: z.enum(['mco', 'prestige', 'trim']),
  platform: z.string().trim().max(20),
  url: z.string().trim().min(3).max(400),
});

partnerSocialRoutes.put('/', asyncHandler(async (req, res) => {
  const b = parse(putSchema, req.body);
  if (!PLATFORMS.some((p) => p.id === b.platform)) throw new HttpError(400, 'bad_platform', 'Unknown platform');
  const url = cleanSocialUrl(b.url, b.platform);
  if (!url) throw new HttpError(400, 'bad_link', 'That does not look like a link. Paste the full address of the page.');
  await query(
    'INSERT INTO social_links (store, platform, url, updated_by) VALUES ($1, $2, $3, $4) ON CONFLICT (store, platform) DO UPDATE SET url = EXCLUDED.url, updated_by = EXCLUDED.updated_by, updated_at = now()',
    [b.store, b.platform, url, req.user.id]
  );
  await audit(req, { action: 'social.saved', entityType: 'social_link', entityId: b.store + ':' + b.platform, actorUserId: req.user.id, details: { url } });
  res.json({ ok: true, url });
}));

partnerSocialRoutes.delete('/:id', asyncHandler(async (req, res) => {
  if (!/^\d{1,18}$/.test(req.params.id)) throw new HttpError(404, 'not_found', 'Not found');
  const d = await query('DELETE FROM social_links WHERE id = $1 RETURNING store, platform', [req.params.id]);
  if (!d.rows[0]) throw new HttpError(404, 'not_found', 'Not found');
  await audit(req, { action: 'social.removed', entityType: 'social_link', entityId: d.rows[0].store + ':' + d.rows[0].platform, actorUserId: req.user.id, details: {} });
  res.json({ ok: true });
}));
