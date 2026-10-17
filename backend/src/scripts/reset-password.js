import { parseArgs } from 'node:util';
import { pool, query } from '../db/pool.js';
import { hashPassword, generateTempPassword } from '../auth/password.js';
import { audit } from '../audit.js';

// Resets one PARTNER's password to a temporary one (shown once). The partner must change it at first login.
// From backend: node --env-file=.env src/scripts/reset-password.js --email partner@example.com
const { values } = parseArgs({ options: { email: { type: 'string' } } });
const email = (values.email || '').trim().toLowerCase();

try {
  if (!email) throw new Error('give --email');
  const found = await query("SELECT id, full_name, partner_stage FROM users WHERE lower(email) = $1 AND role = 'partner'", [email]);
  if (!found.rows[0]) {
    const all = await query("SELECT email FROM users WHERE role = 'partner' ORDER BY email");
    throw new Error('no partner with that email. Partner emails: ' + all.rows.map((r) => r.email).join(', '));
  }
  const temp = generateTempPassword();
  await query('UPDATE users SET password_hash = $2, must_change_password = true WHERE id = $1', [found.rows[0].id, await hashPassword(temp)]);
  await audit(null, { action: 'user.password_reset_by_admin_script', entityType: 'user', entityId: String(found.rows[0].id), details: { role: 'partner' } });
  console.log('Reset password for ' + found.rows[0].full_name + ' (' + email + ')');
  console.log('Temporary password (shown once): ' + temp);
} catch (err) {
  console.error('Error: ' + err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
