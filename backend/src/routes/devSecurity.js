import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { query } from '../db/pool.js';
import { asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';

// Developer desk, Security group. Tests our own backend only. Read-only.
export const devSecurityRoutes = Router();

devSecurityRoutes.get('/sec/scan', asyncHandler(async (req, res) => {
  const base = 'http://127.0.0.1:' + (process.env.PORT || 3000);
  const checks = [];
  const add = (name, level, detail) => checks.push({ name, level, detail });
  const call = (p, opt) => fetch(base + p, { signal: AbortSignal.timeout(8000), ...opt });
  try {
    const r = await call('/health', { headers: { Origin: 'https://evil.example' } });
    const h = r.headers;
    add('Browsers told not to guess file types', h.get('x-content-type-options') === 'nosniff' ? 'pass' : 'fail', 'Header x-content-type-options');
    add('Server does not announce its software', h.get('x-powered-by') ? 'fail' : 'pass', 'Header x-powered-by');
    add('Unknown websites refused by CORS', h.get('access-control-allow-origin') ? 'fail' : 'pass', 'Tested with a fake website address');
    add('HTTPS forced by header', h.get('strict-transport-security') ? 'pass' : 'warn', 'Normally added by the host in production');
    const d = await call('/v1/dev/ping');
    add('Developer routes need a sign-in', d.status === 401 || d.status === 403 ? 'pass' : 'fail', 'Answered ' + d.status);
    const n = await call('/v1/zz-not-here');
    const body = await n.text();
    add('Errors do not leak code paths', /node_modules|\n\s+at /.test(body) ? 'fail' : 'pass', 'Answered ' + n.status);
    const l = await call('/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Interface': 'dev' }, body: '{}' });
    const rl = ['ratelimit-limit', 'x-ratelimit-limit', 'retry-after'].some((k) => l.headers.get(k));
    add('Login has a rate limit', rl ? 'pass' : 'warn', rl ? 'Limit header found' : 'No limit header seen, check the limiter');
  } catch (e) { add('Backend could not test itself', 'fail', String(e.message).slice(0, 150)); }
  const js = process.env.JWT_SECRET || '';
  add('Token secret is long enough', js.length >= 32 ? 'pass' : 'fail', js.length + ' characters (needs 32 or more)');
  add('CORS list has no wildcard', (process.env.CORS_ORIGINS || '').includes('*') ? 'fail' : 'pass', 'CORS_ORIGINS');
  add('Running in production mode', process.env.NODE_ENV === 'production' ? 'pass' : 'warn', 'NODE_ENV is ' + (process.env.NODE_ENV || 'not set') + ' (fine on your laptop)');
  res.json({ at: new Date().toISOString(), checks });
}));

const loginSchema = z.object({ hours: z.coerce.number().int().min(6).max(168).default(72) });
devSecurityRoutes.get('/sec/logins', asyncHandler(async (req, res) => {
  const { hours } = parse(loginSchema, req.query);
  const win = "path LIKE '%/auth/login%' AND method = 'POST' AND at >= now() - ($1::int * interval '1 hour')";
  const series = await query(
    `SELECT date_trunc('hour', at) AS hour, count(*) FILTER (WHERE status IN (400, 401, 403))::int AS failed,
       count(*) FILTER (WHERE status = 429)::int AS blocked, count(*) FILTER (WHERE status < 400)::int AS ok
     FROM request_log WHERE ${win} GROUP BY 1 ORDER BY 1`, [hours]);
  const by = await query(
    `SELECT coalesce(interface, 'unknown') AS iface, count(*) FILTER (WHERE status IN (400, 401, 403))::int AS failed,
       count(*) FILTER (WHERE status = 429)::int AS blocked, count(*) FILTER (WHERE status < 400)::int AS ok
     FROM request_log WHERE ${win} GROUP BY 1 ORDER BY failed DESC`, [hours]);
  res.json({ hours, series: series.rows, byInterface: by.rows });
}));

const SEV = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };
let depCache = null;
function runAudit() {
  return new Promise((resolve) => {
    const up = path.resolve(process.cwd(), '..');
    const cwd = fs.existsSync(path.join(up, 'package-lock.json')) ? up : process.cwd();
    exec('npm audit --json', { cwd, timeout: 90000, maxBuffer: 20 * 1024 * 1024 }, (err, stdout) => {
      let j;
      try { j = JSON.parse(stdout); } catch (e) { return resolve({ error: 'npm audit gave no readable answer. Is the internet on?' }); }
      if (j.error) return resolve({ error: String(j.error.summary || j.error.code || 'npm audit failed').slice(0, 200) });
      const list = Object.values(j.vulnerabilities || {}).map((x) => ({
        name: x.name, severity: x.severity, direct: !!x.isDirect,
        fix: x.fixAvailable ? (typeof x.fixAvailable === 'object' ? 'Update ' + x.fixAvailable.name + ' to ' + x.fixAvailable.version : 'Fix available') : 'No fix yet',
      })).sort((a, b) => (SEV[a.severity] ?? 9) - (SEV[b.severity] ?? 9)).slice(0, 40);
      resolve({ at: new Date().toISOString(), counts: (j.metadata && j.metadata.vulnerabilities) || {}, list });
    });
  });
}
devSecurityRoutes.get('/sec/deps', asyncHandler(async (req, res) => {
  if (req.query.fresh === '1') {
    depCache = await runAudit();
    try { await audit(req, { action: 'security.dep_audit', entityType: 'system', entityId: 'npm', actorUserId: req.user && req.user.id, details: {} }); } catch (e) { /* ignore */ }
  }
  res.json(depCache || { empty: true });
}));

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.wrangler', '.vite']);
const EXT = new Set(['.js', '.jsx', '.json', '.md', '.sql', '.txt', '.yml', '.yaml', '.ps1', '.html', '.toml']);
const PATTERNS = [
  ['Private key block', /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['Database address with a password', /postgres(ql)?:\/\/[^\s:@'"]+:[^\s@'"]{3,}@/],
  ['Image storage address with a secret', /cloudinary:\/\/\d+:[^\s@]+@/],
  ['Email service key', /xkeysib-[A-Za-z0-9-]{20,}/],
  ['Secret value written in a file', /(CF_AI_TOKEN|JWT_SECRET|OPENWA_KEY|SMS_GATEWAY_KEY)\s*[=:]\s*['"]?[A-Za-z0-9_-]{16,}/],
];
function walk(dir, out) {
  let items = [];
  try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const it of items) {
    if (it.isDirectory()) { if (!SKIP.has(it.name)) walk(path.join(dir, it.name), out); continue; }
    if (it.name.endsWith('.example') || it.name === 'devSecurity.js') continue;
    if (EXT.has(path.extname(it.name))) out.push(path.join(dir, it.name));
  }
}
devSecurityRoutes.get('/sec/secrets', asyncHandler(async (req, res) => {
  const root = path.resolve(process.cwd(), '..');
  if (!fs.existsSync(path.join(root, 'apps'))) return res.json({ notHere: true });
  const files = [];
  walk(root, files);
  const hits = [];
  for (const f of files) {
    let t = '';
    try { if (fs.statSync(f).size > 1000000) continue; t = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
    t.split('\n').forEach((line, i) => {
      for (const [what, re] of PATTERNS) if (re.test(line)) hits.push({ file: path.relative(root, f), line: i + 1, what });
    });
  }
  let ignore = '';
  try { ignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8'); } catch (e) { /* none */ }
  const tracked = await new Promise((resolve) => exec('git ls-files', { cwd: root, timeout: 15000 }, (err, out) => resolve(err ? null : out.split('\n').filter((x) => /(^|\/)\.env$/.test(x.trim())))));
  res.json({ scanned: files.length, hits: hits.slice(0, 100), gitignoreOk: /^\s*\.env/m.test(ignore), envTracked: tracked });
}));
