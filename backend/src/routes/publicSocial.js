import { Router } from 'express';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { STORES, PLATFORMS } from '../socialLinks.js';

// Public: the social links a shop shows to customers.
export const publicSocialRoutes = Router();

publicSocialRoutes.get('/:store', asyncHandler(async (req, res) => {
  const store = String(req.params.store);
  if (!STORES.includes(store)) throw new HttpError(404, 'not_found', 'Unknown store');
  const { rows } = await query('SELECT platform, url FROM social_links WHERE store = $1', [store]);
  const order = PLATFORMS.map((p) => p.id);
  rows.sort((a, b) => order.indexOf(a.platform) - order.indexOf(b.platform));
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ links: rows });
}));
