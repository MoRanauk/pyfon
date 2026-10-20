import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { config } from '../config.js';
import { asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';

// Developer desk, Security group: Access matrix test and Pen-test lab.
// Tests ONLY this backend, over 127.0.0.1. Test tokens live in memory for minutes and are never shown or saved.
export const devSecurityLabRoutes = Router();
const BASE = () => 'http://127.0.0.1:' + (process.env.PORT || 3000);
const IFACE = { customer: 'mco', partner: 'm3-finance', developer: 'dev', vendor: 'vendor' };
const ROLES = ['customer', 'partner', 'developer', 'vendor'];
const blocked = (r) => r.status === 401 || r.status === 403;

async function who() {
  const out = {};
  for (const r of ROLES) {
    const { rows } = await query('SELECT id, partner_stage FROM users WHERE role = $1 AND is_active AND NOT must_change_password LIMIT 1', [r]);
    if (rows[0]) out[r] = rows[0];
  }
  return out;
}
function mint(u, role, o = {}) {
  const now = Math.floor(Date.now() / 1000);
  const p = { role: o.claim || role, stage: u.partner_stage, iface: o.iface || IFACE[role], iat: now, exp: now + (o.ttl === undefined ? 300 : o.ttl) };
  return jwt.sign(p, o.secret || config.jwtSecret, { algorithm: 'HS256', issuer: 'pyfon', subject: o.sub || u.id });
}
async function hit(method, path, o = {}) {
  const h = {};
  if (o.iface) h['X-Interface'] = o.iface;
  if (o.token) h.Authorization = 'Bearer ' + o.token;
  if (o.body !== undefined) h['Content-Type'] = 'application/json';
  try {
    const r = await fetch(BASE() + path, { method, headers: h, body: o.body, signal: AbortSignal.timeout(8000) });
    const text = await r.text();
    return { status: r.status, text, headers: r.headers };
  } catch (e) { return { status: 0, text: String(e.message), headers: new Headers() }; }
}
async function note(req, action) {
  try { await audit(req, { action, entityType: 'system', entityId: 'own-api', actorUserId: req.user && req.user.id, details: {} }); } catch (e) { /* ignore */ }
}

// [role that should get in, safe GET route]
const PROBES = [
  ['customer', '/v1/customer/ping'],
  ['partner', '/v1/partner/ping'],
  ['partner', '/v1/partner/money/summary'],
  ['partner', '/v1/partner/reports/jobs-per-stage'],
  ['developer', '/v1/dev/ping'],
  ['developer', '/v1/dev/system/uptime?days=1'],
  ['developer', '/v1/dev/reports/jobs-per-stage'],
  ['vendor', '/v1/vendor/ping'],
];
devSecurityLabRoutes.get('/sec/access', asyncHandler(async (req, res) => {
  const U = await who();
  const rows = [];
  for (const [owner, path] of PROBES) {
    const cells = [];
    for (const role of ['anonymous', ...ROLES]) {
      let r;
      if (role === 'anonymous') r = await hit('GET', path, { iface: IFACE[owner] });
      else if (!U[role]) { cells.push({ role, status: null, ok: null }); continue; }
      else r = await hit('GET', path, { iface: IFACE[role], token: mint(U[role], role) });
      const reached = !blocked(r) && r.status !== 404 && r.status < 500;
      cells.push({ role, status: r.status, ok: role === owner ? reached : blocked(r) });
    }
    rows.push({ path, owner, cells });
  }
  await note(req, 'security.access_matrix');
  res.json({ at: new Date().toISOString(), rows, missing: ROLES.filter((r) => !U[r]) });
}));

const R = (ok, detail) => ({ level: ok ? 'pass' : 'fail', detail });
const skip = (what) => ({ level: 'warn', detail: 'Skipped: no active ' + what + ' account without a temporary password' });
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const ghost = () => ({ id: crypto.randomUUID(), partner_stage: null });
const SQLWORDS = /syntax error|pg_catalog|postgres|does not exist|SQLSTATE/i;
const TESTS = [
  ['Token signed with a wrong secret is refused', async () => {
    const t = mint(ghost(), 'developer', { secret: crypto.randomBytes(32).toString('hex') });
    const r = await hit('GET', '/v1/dev/ping', { iface: 'dev', token: t });
    return R(r.status === 401, 'Answered ' + r.status);
  }],
  ['Unsigned token (alg none) is refused', async (U) => {
    if (!U.developer) return skip('developer');
    const now = Math.floor(Date.now() / 1000);
    const t = b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({ sub: U.developer.id, iss: 'pyfon', role: 'developer', iface: 'dev', iat: now, exp: now + 300 }) + '.';
    const r = await hit('GET', '/v1/dev/ping', { iface: 'dev', token: t });
    return R(r.status === 401, 'Answered ' + r.status);
  }],
  ['Expired token is refused', async (U) => {
    if (!U.developer) return skip('developer');
    const r = await hit('GET', '/v1/dev/ping', { iface: 'dev', token: mint(U.developer, 'developer', { ttl: -60 }) });
    return R(r.status === 401, 'Answered ' + r.status);
  }],
  ['Token for a person who does not exist is refused', async () => {
    const r = await hit('GET', '/v1/dev/ping', { iface: 'dev', token: mint(ghost(), 'developer') });
    return R(r.status === 401, 'Answered ' + r.status);
  }],
  ['Token used on the wrong interface is refused', async (U) => {
    if (!U.developer) return skip('developer');
    const r = await hit('GET', '/v1/customer/ping', { iface: 'mco', token: mint(U.developer, 'developer') });
    return R(r.status === 403, 'Answered ' + r.status);
  }],
  ['A role edited inside a token is ignored', async (U) => {
    if (!U.customer) return skip('customer');
    const r = await hit('GET', '/v1/dev/ping', { iface: 'dev', token: mint(U.customer, 'customer', { claim: 'developer', iface: 'dev' }) });
    return R(r.status === 403, 'Customer claiming developer answered ' + r.status);
  }],
  ['Customer cannot reach partner or developer routes', async (U) => {
    if (!U.customer) return skip('customer');
    const t = mint(U.customer, 'customer');
    const a = await hit('GET', '/v1/partner/ping', { iface: 'mco', token: t });
    const b = await hit('GET', '/v1/dev/ping', { iface: 'dev', token: t });
    return R(blocked(a) && blocked(b), 'Partner ' + a.status + ', developer ' + b.status);
  }],
  ['Partner cannot reach developer routes', async (U) => {
    if (!U.partner) return skip('partner');
    const a = await hit('GET', '/v1/dev/ping', { iface: 'dev', token: mint(U.partner, 'partner') });
    const b = await hit('GET', '/v1/dev/system/uptime', { iface: 'm3-finance', token: mint(U.partner, 'partner') });
    return R(blocked(a) && blocked(b), 'Ping ' + a.status + ', uptime ' + b.status);
  }],
  ['Odd characters in query strings do not break the database', async (U) => {
    if (!U.developer) return skip('developer');
    const t = mint(U.developer, 'developer');
    const bad = [encodeURIComponent("1'; DROP TABLE users;--"), encodeURIComponent('1 OR 1=1'), encodeURIComponent('%00<script>')];
    const paths = ['/v1/dev/system/uptime?days=', '/v1/dev/system/graphs?hours=', '/v1/dev/reports/sales?days='];
    let worst = 0; let leak = false;
    for (const p of paths) for (const b of bad) {
      const r = await hit('GET', p + b, { iface: 'dev', token: t });
      worst = Math.max(worst, r.status); if (SQLWORDS.test(r.text)) leak = true;
    }
    return R(worst < 500 && !leak, 'Worst answer ' + worst + (leak ? ', database words leaked' : ', nothing leaked'));
  }],
  ['Oversized body is refused cleanly', async () => {
    const r = await hit('POST', '/v1/auth/login', { iface: 'dev', body: '{"a":"' + 'x'.repeat(150000) + '"}' });
    return R(r.status >= 400 && r.status < 500, 'Answered ' + r.status);
  }],
  ['Broken JSON is refused cleanly', async () => {
    const r = await hit('POST', '/v1/auth/login', { iface: 'dev', body: '{bad' });
    return R(r.status === 400, 'Answered ' + r.status);
  }],
  ['Rate limit headers are sent', async () => {
    const a = await hit('GET', '/health');
    const b = await hit('POST', '/v1/auth/login', { iface: 'dev', body: '{}' });
    const x = a.headers.get('ratelimit-limit'); const y = b.headers.get('ratelimit-limit');
    return R(!!x && !!y, 'Site limit ' + x + ' per minute, login limit ' + y);
  }],
];

const labSchema = z.object({ hammer: z.boolean().default(false) });
devSecurityLabRoutes.post('/sec/pentest', asyncHandler(async (req, res) => {
  const { hammer } = parse(labSchema, req.body || {});
  const U = await who();
  const results = [];
  for (const [name, fn] of TESTS) {
    let o;
    try { o = await fn(U); } catch (e) { o = { level: 'fail', detail: 'Test crashed: ' + String(e.message).slice(0, 120) }; }
    results.push({ name, ...o });
  }
  if (hammer) {
    let blockedAt = 0;
    for (let i = 1; i <= 25; i++) {
      const r = await hit('POST', '/v1/auth/login', { iface: 'dev', body: JSON.stringify({ email: 'pentest' + i + '@example.com', password: 'wrong-password-' + i }) });
      if (r.status === 429) { blockedAt = i; break; }
    }
    results.push({ name: 'Login rate limit stops guessing', ...R(blockedAt > 0, blockedAt ? 'Blocked on try ' + blockedAt : 'Not blocked after 25 tries') });
  }
  await note(req, hammer ? 'security.pentest_hammer' : 'security.pentest');
  res.json({ at: new Date().toISOString(), results });
}));
