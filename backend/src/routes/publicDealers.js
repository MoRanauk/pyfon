import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncHandler } from '../errors.js';

// Public list of dealers for the "Featured dealers" strip. No phone numbers or codes are shown.
export const publicDealerRoutes = Router();

publicDealerRoutes.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT name, speciality, blurb, image, featured FROM vendors
      WHERE status = 'active' ORDER BY featured DESC, name LIMIT 24`
  );
  res.json({ dealers: rows });
}));
