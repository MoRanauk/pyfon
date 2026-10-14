import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';

async function load(req, { allowPasswordChange }) {
  const m = (req.get('authorization') || '').match(/^Bearer (.+)$/i);
  if (!m) throw new HttpError(401, 'unauthenticated', 'Please log in');
  let payload;
  try {
    payload = jwt.verify(m[1], config.jwtSecret, { algorithms: ['HS256'], issuer: 'pyfon' });
  } catch {
    throw new HttpError(401, 'invalid_token', 'Your session is invalid or has expired');
  }
  if (!req.interfaceCode || payload.iface !== req.interfaceCode) {
    throw new HttpError(403, 'wrong_interface', 'This session belongs to a different interface');
  }
  const { rows } = await query(
    'SELECT id, email, full_name, role, partner_stage, is_active, must_change_password FROM users WHERE id = $1',
    [payload.sub]
  );
  const u = rows[0];
  if (!u || !u.is_active) throw new HttpError(401, 'invalid_token', 'Your session is invalid or has expired');
  if (u.must_change_password && !allowPasswordChange) {
    throw new HttpError(403, 'password_change_required', 'Please change your temporary password first');
  }
  req.user = {
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    role: u.role,
    stage: u.partner_stage,
    interface: payload.iface,
    mustChangePassword: u.must_change_password,
  };
}

export const authenticate = asyncHandler(async (req, res, next) => {
  await load(req, { allowPasswordChange: false });
  next();
});

export const authenticateLoose = asyncHandler(async (req, res, next) => {
  await load(req, { allowPasswordChange: true });
  next();
});

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new HttpError(403, 'forbidden', 'You do not have access to this');
  }
  next();
};
