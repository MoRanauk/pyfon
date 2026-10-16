import { parseArgs } from 'node:util';
import { pool, query } from '../db/pool.js';
import { hashPassword, generateTempPassword } from '../auth/password.js';
import { audit } from '../audit.js';

// Creates a dealer login linked to one dealer. From backend:
//   node --env-file=.env src/scripts/create-dealer-user.js --email dealer1@example.com --name "Dealer One" --dealer "Test Dealer One"
const { values } = parseArgs({ options: { email: { type: 'string' }, name: { type: 'string' }, dealer: { type: 'string' } } });
const email = (values.email || '').trim().toLowerCase();
const name = (values.name || '').trim();
const dealer = (values.dealer || '').trim();

function fail(msg) {
  console.error('Error: ' + msg);
  process.exit(1);
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('give a valid --email');
if (name.length < 2) fail('give a --name');
if (!dealer) fail('give --dealer (the dealer name or code)');

try {
  const d = await query(
    `SELECT code, name FROM vendors WHERE status = 'active' AND (lower(name) = lower($1) OR upper(code) = upper($1))`,
    [dealer]
  );
  if (!d.rows[0]) fail('no active dealer called "' + dealer + '". Run add-dealer.js --list to see the dealers.');
  const temp = generateTempPassword();
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, full_name, role, vendor_code, must_change_password)
     VALUES ($1, $2, $3, 'vendor', $4, true) RETURNING id`,
    [email, await hashPassword(temp), name, d.rows[0].code]
  );
  await audit(null, { action: 'user.created_by_admin_script', entityType: 'user', entityId: rows[0].id, details: { role: 'vendor', dealer: d.rows[0].code } });
  console.log('Created dealer login for ' + d.rows[0].name + ' (' + d.rows[0].code + '): ' + email);
  console.log('Temporary password (shown once): ' + temp);
} catch (err) {
  if (err.code === '23505') console.error('Error: that email is already registered.');
  else console.error('Error: ' + err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
