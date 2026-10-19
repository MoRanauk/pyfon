import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../errors.js';

export const partnerConnectRoutes = Router();
const pick = (j, keys) => { for (const k of keys) { if (j[k]) return String(j[k]); } return ''; };

partnerConnectRoutes.get('/connect/developers', asyncHandler(async (req, res) => {
  const r = await pool.query("SELECT to_jsonb(u) AS j FROM users u WHERE u.role = 'developer'");
  res.json({ people: r.rows.map(({ j }) => ({ id: String(j.id), name: pick(j, ['full_name', 'name']), phone: pick(j, ['phone']), email: pick(j, ['email']) })) });
}));

partnerConnectRoutes.get('/connect/dealers', asyncHandler(async (req, res) => {
  const r = await pool.query('SELECT to_jsonb(v) AS j FROM vendors v');
  res.json({ people: r.rows.map(({ j }) => ({ id: String(j.id), name: pick(j, ['name', 'business_name', 'company_name', 'title', 'code']), phone: pick(j, ['phone']), email: pick(j, ['email']) })) });
}));
