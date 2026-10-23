import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { unseal } from '../vaultCrypto.js';

// Encrypted code mirror. Developer role only (mounted under /v1/dev/system). The passphrase is never stored.
export const devVaultRoutes = Router();
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, limit: 80, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: 'too_many_attempts', message: 'Too many tries. Wait a few minutes.' } }),
});
const fails = new Map();
const cache = new Map();
const pw = z.object({ passphrase: z.string().min(1).max(200) });

async function snapshot(req) {
  if (!/^\d{1,9}$/.test(req.params.id)) throw new HttpError(404, 'not_found', 'Snapshot not found');
  const { rows } = await query('SELECT * FROM code_vault WHERE id = $1', [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'not_found', 'Snapshot not found');
  return rows[0];
}
function openIt(req, row) {
  const { passphrase } = parse(pw, req.body || {});
  const uid = String(req.user.id);
  const f = fails.get(uid);
  if (f && f.n >= 5 && Date.now() < f.until) throw new HttpError(429, 'locked', 'Too many wrong passphrases. Try again in 15 minutes.');
  const ck = row.id + ':' + crypto.createHash('sha256').update(passphrase).digest('hex');
  const hit = cache.get(ck);
  if (hit && hit.exp > Date.now()) return hit.data;
  try {
    const data = unseal(row, passphrase);
    fails.delete(uid);
    cache.set(ck, { data, exp: Date.now() + 5 * 60 * 1000 });
    if (cache.size > 2) cache.delete(cache.keys().next().value);
    return data;
  } catch (e) {
    const n = (f && Date.now() < f.until ? f.n : 0) + 1;
    fails.set(uid, { n, until: Date.now() + 15 * 60 * 1000 });
    throw new HttpError(403, 'bad_passphrase', 'That passphrase did not open this snapshot.');
  }
}
const log = (req, action, row, details) => audit(req, { action, entityType: 'code_vault', entityId: String(row.id), actorUserId: req.user.id, details });

devVaultRoutes.get('/vault', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id, label, git_commit, file_count, bytes, sha256, created_by, created_at FROM code_vault ORDER BY id DESC LIMIT 50');
  res.json({ snapshots: rows.map((r) => ({ id: String(r.id), label: r.label, commit: r.git_commit, files: r.file_count, bytes: r.bytes, sha: r.sha256.slice(0, 12), by: r.created_by, at: r.created_at })) });
}));
devVaultRoutes.post('/vault/:id/files', limiter, asyncHandler(async (req, res) => {
  const row = await snapshot(req);
  const data = openIt(req, row);
  await log(req, 'vault.unlock', row, {});
  res.json({ files: data.files.map((f) => ({ p: f.p, n: f.c.length })) });
}));
devVaultRoutes.post('/vault/:id/file', limiter, asyncHandler(async (req, res) => {
  const row = await snapshot(req);
  const { path } = parse(z.object({ path: z.string().min(1).max(400) }), req.body || {});
  const data = openIt(req, row);
  const f = data.files.find((x) => x.p === path);
  if (!f) throw new HttpError(404, 'not_found', 'File not in this snapshot');
  await log(req, 'vault.read', row, { path });
  res.json({ path: f.p, content: f.c });
}));
devVaultRoutes.post('/vault/:id/search', limiter, asyncHandler(async (req, res) => {
  const row = await snapshot(req);
  const { q } = parse(z.object({ q: z.string().trim().min(2).max(80) }), req.body || {});
  const data = openIt(req, row);
  const needle = q.toLowerCase();
  const hits = [];
  for (const f of data.files) {
    const lines = f.c.split('\n');
    for (let i = 0; i < lines.length && hits.length < 200; i++) {
      if (lines[i].toLowerCase().includes(needle)) hits.push({ p: f.p, line: i + 1, text: lines[i].trim().slice(0, 200) });
    }
    if (hits.length >= 200) break;
  }
  await log(req, 'vault.search', row, { q });
  res.json({ hits });
}));
devVaultRoutes.get('/vault/:id/download', limiter, asyncHandler(async (req, res) => {
  const row = await snapshot(req);
  await log(req, 'vault.download', row, {});
  res.set('Content-Disposition', 'attachment; filename="pyfon-vault-' + row.id + '.json"');
  res.json({ v: 1, id: row.id, label: row.label, salt: row.salt, iv: row.iv, tag: row.tag, blob_b64: row.blob_b64 });
}));
