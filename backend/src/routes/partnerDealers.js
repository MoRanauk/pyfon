import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncHandler } from '../errors.js';

// Active dealers for the Production dropdown. No phone or email is sent.
export const partnerDealerRoutes = Router();

partnerDealerRoutes.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query("SELECT code, name, speciality FROM vendors WHERE status = 'active' ORDER BY name");
  res.json({ dealers: rows.map((r) => ({ code: r.code, name: r.name, speciality: r.speciality || '' })) });
}));
