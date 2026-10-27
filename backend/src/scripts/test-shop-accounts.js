import { query } from '../db/pool.js';
const API = 'http://localhost:' + (process.env.PORT || 3000) + '/v1/auth';
const email = 'shoptest+' + Date.now() + '@example.com';
const pass = 'ShopTest-12345';
async function call(p, iface, body) {
  const r = await fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Interface': iface }, body: JSON.stringify(body) });
  return r.status;
}
const reg = (i) => call('/register', i, { email, password: pass, full_name: 'Shop Test', phone: '+254712345678' });
const log = (i) => call('/login', i, { email, password: pass });
const checks = [
  ['sign up at mco', () => reg('mco'), 201],
  ['log in at mco', () => log('mco'), 200],
  ['log in at prestige (must fail)', () => log('prestige'), 401],
  ['log in at trim (must fail)', () => log('trim'), 401],
  ['sign up at prestige, same email', () => reg('prestige'), 201],
  ['log in at prestige', () => log('prestige'), 200],
  ['sign up at mco again (must refuse)', () => reg('mco'), 409],
  ['log in at mco still works', () => log('mco'), 200],
];
let bad = 0;
for (const [name, fn, want] of checks) {
  const got = await fn();
  const ok = got === want;
  if (!ok) bad += 1;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + ' (got ' + got + ', wanted ' + want + ')');
}
await query('UPDATE users SET is_active = false WHERE lower(email) = lower($1)', [email]);
console.log(bad === 0 ? 'ALL PASS' : bad + ' FAILED');
process.exit(bad === 0 ? 0 : 1);
