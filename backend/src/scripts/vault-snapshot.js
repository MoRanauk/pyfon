import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { query } from '../db/pool.js';
import { seal } from '../vaultCrypto.js';

const pass = process.env.VAULT_PASSPHRASE;
if (!pass || pass.length < 12) { console.log('FAIL: add VAULT_PASSPHRASE (12 or more characters) to backend\\.env first'); process.exit(1); }
const label = process.argv[2] || 'Snapshot ' + new Date().toISOString().slice(0, 16);
const root = path.resolve('..');
const list = execSync('git ls-files -co --exclude-standard', { cwd: root, maxBuffer: 64 * 1024 * 1024 }).toString().split(/\r?\n/).filter(Boolean);
const SKIP = /(^|\/)(node_modules|dist|\.git)\/|(^|\/)\.env(\.(?!example$)[^\/]*)?$|\.(png|jpe?g|webp|gif|ico|zip|woff2?|pdf|mp4|mov|lock)$|package-lock\.json$/i;
const files = [];
let skipped = 0; let secret = 0; let bytes = 0;
for (const p of list) {
  if (SKIP.test(p)) { skipped++; continue; }
  const f = path.join(root, p);
  let st; try { st = fs.statSync(f); } catch (e) { continue; }
  if (!st.isFile() || st.size > 400000 || bytes > 20000000) { skipped++; continue; }
  const c = fs.readFileSync(f, 'utf8');
  if (c.includes('\u0000')) { skipped++; continue; }
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(c)) { secret++; continue; }
  files.push({ p, c });
  bytes += c.length;
}
const json = JSON.stringify({ v: 1, files });
const sealed = seal(json, pass);
const sha = crypto.createHash('sha256').update(json).digest('hex');
let commit = '';
try { commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim(); } catch (e) { /* ignore */ }
await query(
  'INSERT INTO code_vault (label, git_commit, file_count, bytes, sha256, salt, iv, tag, blob_b64, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
  [label, commit, files.length, bytes, sha, sealed.salt, sealed.iv, sealed.tag, sealed.blob, 'local script']
);
console.log('PASS: saved ' + files.length + ' files (' + Math.round(bytes / 1024) + ' KB), skipped ' + skipped + ', held back ' + secret + ' with private keys.');
process.exit(0);
