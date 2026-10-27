import { query } from '../db/pool.js';
import fs from 'node:fs';
const email = process.argv[2];
if (!email) { console.log('Use: node --env-file=.env src\\scripts\\set-auto-user.js finance-partner-email'); process.exit(1); }
const { rows } = await query('SELECT id, role FROM users WHERE lower(email) = lower($1)', [email]);
if (!rows[0] || rows[0].role !== 'partner') { console.log('FAIL: that is not a partner account'); process.exit(1); }
if (/^MPESA_AUTO_USER_ID=/m.test(fs.readFileSync('.env', 'utf8'))) { console.log('Already set'); process.exit(0); }
fs.appendFileSync('.env', '\nMPESA_AUTO_USER_ID=' + rows[0].id + '\n');
console.log('PASS: saved the partner id');
process.exit(0);
