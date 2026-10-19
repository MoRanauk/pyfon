import fs from 'node:fs';
import { query, pool } from '../db/pool.js';
const c = await query("SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'sessions_valid_after'");
if (!c.rows.length) { console.log('FAIL: column missing, run npm run migrate first. Nothing patched.'); await pool.end(); process.exit(1); }
const f = 'src/middleware/auth.js';
const o1 = "'SELECT id, email, full_name, role, partner_stage, is_active, must_change_password FROM users WHERE id = $1',";
const n1 = "'SELECT id, email, full_name, role, partner_stage, is_active, must_change_password, sessions_valid_after FROM users WHERE id = $1',";
const o2 = '  if (u.must_change_password && !allowPasswordChange) {';
const n2 = `  if (u.sessions_valid_after && payload.iat && payload.iat * 1000 < new Date(u.sessions_valid_after).getTime() - 1000) {
    throw new HttpError(401, 'invalid_token', 'Your session was ended. Please sign in again.');
  }
` + o2;
let t = fs.readFileSync(f, 'utf8');
let bad = 0;
for (const [o, n, l] of [[o1, n1, 'select'], [o2, n2, 'check']]) {
  if (t.includes(n)) console.log('Already done: ' + l);
  else if (!t.includes(o)) { console.log('NOT FOUND: ' + l); bad++; }
  else { t = t.replace(o, () => n); console.log('Patched: ' + l); }
}
if (!bad) fs.writeFileSync(f, t);
await pool.end();
process.exit(bad ? 1 : 0);
