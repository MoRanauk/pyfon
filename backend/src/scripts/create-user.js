import { parseArgs } from 'node:util';
import { pool, query } from '../db/pool.js';
import { hashPassword, generateTempPassword } from '../auth/password.js';
import { audit } from '../audit.js';

const { values } = parseArgs({
  options: { email: { type: 'string' }, name: { type: 'string' }, role: { type: 'string' }, stage: { type: 'string' } },
});
const email = (values.email || '').trim().toLowerCase();
const name = (values.name || '').trim();
const role = values.role;
const stage = values.stage || null;

function fail(msg) {
  console.error('Error: ' + msg);
  process.exit(1);
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('give a valid --email');
if (name.length < 2) fail('give a --name');
if (!['partner', 'developer'].includes(role)) fail('--role must be partner or developer');
if (role === 'partner' && !['creative', 'production', 'finance'].includes(stage)) {
  fail('partners need --stage creative, production or finance');
}
if (role !== 'partner' && stage) fail('--stage is only for partners');

const temp = generateTempPassword();
try {
  const { rows } = await query(
    'INSERT INTO users (email, password_hash, full_name, role, partner_stage, must_change_password) VALUES ($1, $2, $3, $4, $5, true) RETURNING id',
    [email, await hashPassword(temp), name, role, stage]
  );
  await audit(null, { action: 'user.created_by_admin_script', entityType: 'user', entityId: rows[0].id, details: { role, stage } });
  console.log('Created ' + role + (stage ? ' (' + stage + ')' : '') + ': ' + email);
  console.log('Temporary password (shown once): ' + temp);
} catch (err) {
  if (err.code === '23505') console.error('Error: that email is already registered, or that stage already has an active partner.');
  else console.error('Error: ' + err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
