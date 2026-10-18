import { parseArgs } from 'node:util';
import { pool, query } from '../db/pool.js';
import { normalizePhone } from '../mail.js';

// Saves a phone number on an account (used for SMS and WhatsApp password codes). From backend:
//   node --env-file=.env src/scripts/set-phone.js --email pyfonbrands@gmail.com --phone 0712345678
const { values: v } = parseArgs({ options: { email: { type: 'string' }, phone: { type: 'string' } } });
try {
  if (!v.email || !v.phone) throw new Error('give --email and --phone');
  const phone = normalizePhone(v.phone);
  if (!phone) throw new Error('use a Kenyan number like 0712345678');
  const r = await query('UPDATE users SET phone = $2 WHERE lower(email) = lower($1) RETURNING email', [v.email, phone]);
  if (!r.rows[0]) throw new Error('no account with that email');
  console.log('Saved the phone number for ' + r.rows[0].email);
} catch (e) {
  console.error('Error: ' + e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
