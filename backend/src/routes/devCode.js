import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';

// Developer desk, Code group: Database map and Code explorer (read only, plus notes).
export const devCodeRoutes = Router();

devCodeRoutes.get('/dbmap', asyncHandler(async (req, res) => {
  const cols = await query("SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position");
  const rows = await query('SELECT relname, n_live_tup::bigint AS n FROM pg_stat_user_tables');
  const fks = await query(
    `SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table, ccu.column_name AS ref_col
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`);
  const count = Object.fromEntries(rows.rows.map((r) => [r.relname, Number(r.n)]));
  const tables = {};
  for (const c of cols.rows) {
    (tables[c.table_name] = tables[c.table_name] || { name: c.table_name, rows: count[c.table_name] ?? 0, columns: [], links: [] })
      .columns.push({ name: c.column_name, type: c.data_type, nullable: c.is_nullable === 'YES' });
  }
  for (const f of fks.rows) if (tables[f.table_name]) tables[f.table_name].links.push(f.column_name + ' \u2192 ' + f.ref_table + '.' + f.ref_col);
  res.json({ tables: Object.values(tables).sort((a, b) => a.name.localeCompare(b.name)) });
}));

const ROOT = () => path.resolve(process.cwd(), '..');
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.wrangler', '.vite']);
const EXT = new Set(['.js', '.jsx', '.json', '.md', '.sql', '.css', '.html', '.yml', '.yaml', '.toml', '.txt', '.ps1']);
const HIDE_LINE = /(KEY|TOKEN|SECRET|PASSWORD)\s*[=:]\s*['"]?[A-Za-z0-9_-]{16,}|postgres(ql)?:\/\/[^\s:@'"]+:[^\s@'"]{3,}@|cloudinary:\/\/\d+:/i;

function walk(dir, root, out) {
  let items = [];
  try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const it of items) {
    if (out.length >= 3000) return;
    const full = path.join(dir, it.name);
    if (it.isDirectory()) { if (!SKIP.has(it.name)) walk(full, root, out); continue; }
    if (/^\.env/i.test(it.name) || !EXT.has(path.extname(it.name))) continue;
    let size = 0;
    try { size = fs.statSync(full).size; } catch (e) { continue; }
    out.push({ p: path.relative(root, full).split(path.sep).join('/'), size });
  }
}
function safe(rel) {
  const root = ROOT();
  const full = path.resolve(root, String(rel));
  if (!full.startsWith(root + path.sep)) throw new HttpError(400, 'bad_path', 'That path is not allowed');
  const parts = path.relative(root, full).split(path.sep);
  const name = parts[parts.length - 1];
  if (parts.some((x) => SKIP.has(x)) || /^\.env/i.test(name) || !EXT.has(path.extname(name))) throw new HttpError(400, 'bad_path', 'That file cannot be shown');
  return { full, rel: parts.join('/') };
}

devCodeRoutes.get('/code/tree', asyncHandler(async (req, res) => {
  const root = ROOT();
  if (!fs.existsSync(path.join(root, 'apps'))) return res.json({ notHere: true });
  const files = [];
  walk(root, root, files);
  files.sort((a, b) => a.p.localeCompare(b.p));
  const n = await query('SELECT path FROM code_notes');
  res.json({ files, noted: n.rows.map((r) => r.path) });
}));

const pathSchema = z.object({ path: z.string().min(1).max(300) });
devCodeRoutes.get('/code/file', asyncHandler(async (req, res) => {
  const { path: p } = parse(pathSchema, req.query);
  const { full, rel } = safe(p);
  let st;
  try { st = fs.statSync(full); } catch (e) { throw new HttpError(404, 'not_found', 'File not found'); }
  if (!st.isFile() || st.size > 200000) throw new HttpError(400, 'too_big', 'File is too large to show (over 200 KB)');
  const text = fs.readFileSync(full, 'utf8').split('\n').map((l) => (HIDE_LINE.test(l) ? '(line hidden: looks like a secret)' : l)).join('\n');
  const n = await query('SELECT note, updated_at FROM code_notes WHERE path = $1', [rel]);
  res.json({ path: rel, text, note: n.rows[0] ? n.rows[0].note : '', noteAt: n.rows[0] ? n.rows[0].updated_at : null });
}));

const noteSchema = z.object({ path: z.string().min(1).max(300), note: z.string().max(4000) });
devCodeRoutes.put('/code/note', asyncHandler(async (req, res) => {
  const b = parse(noteSchema, req.body);
  const { rel } = safe(b.path);
  if (!b.note.trim()) await query('DELETE FROM code_notes WHERE path = $1', [rel]);
  else await query(
    'INSERT INTO code_notes (path, note, updated_by) VALUES ($1, $2, $3) ON CONFLICT (path) DO UPDATE SET note = EXCLUDED.note, updated_by = EXCLUDED.updated_by, updated_at = now()',
    [rel, b.note.trim(), req.user.id]);
  await audit(req, { action: 'tools.code_note', entityType: 'file', entityId: rel.slice(0, 100), actorUserId: req.user.id, details: {} });
  res.json({ ok: true });
}));
