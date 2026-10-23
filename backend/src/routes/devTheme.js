import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';

// Theme manager API, mounted at /v1/dev/theme. Developer only.
export const devThemeRoutes = Router();

const SHOPS = ['prestige', 'trim', 'mco', 'studio'];
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const FONT = /^[A-Za-z0-9 ,'"._-]{1,160}$/;
const RADIUS = /^\d{1,2}(px|rem)$/;

const bodySchema = z.object({
  theme: z.record(z.string().regex(/^--pf-[a-z0-9-]{1,40}$/), z.string().trim().min(1).max(200)),
});

function shopOf(req) {
  const s = String(req.params.store);
  if (!SHOPS.includes(s)) throw new HttpError(404, 'not_found', 'Unknown shop');
  return s;
}

function check(theme) {
  const keys = Object.keys(theme);
  if (keys.length > 40) throw new HttpError(400, 'too_many', 'At most 40 theme values');
  const bad = [];
  for (const k of keys) {
    const v = theme[k];
    if (k === '--pf-font') { if (!FONT.test(v)) bad.push(k); }
    else if (k === '--pf-radius') { if (!RADIUS.test(v)) bad.push(k); }
    else if (!HEX.test(v)) bad.push(k);
  }
  if (bad.length) throw new HttpError(400, 'bad_theme', 'These values are not allowed: ' + bad.join(', '), bad);
}

async function scan(dir, out) {
  let ents;
  try { ents = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') await scan(p, out); continue; }
    if (!/\.(js|jsx|css)$/.test(e.name)) continue;
    const t = await fs.readFile(p, 'utf8');
    for (const m of t.matchAll(/(--pf-[a-z0-9-]+)['"]?\s*:\s*['"]?(#[0-9a-fA-F]{3,6}|[^'";,\r\n}]+)/g)) {
      if (!(m[1] in out)) out[m[1]] = m[2].trim();
    }
  }
}

// Token names and default values found in packages/theme (works on your laptop only).
devThemeRoutes.get('/tokens', asyncHandler(async (req, res) => {
  const out = {};
  await scan(path.resolve(process.cwd(), '..', 'packages', 'theme'), out);
  res.json({ tokens: out });
}));

devThemeRoutes.get('/:store', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT data->\'theme\' AS theme FROM site_content WHERE storefront = $1', [shopOf(req)]);
  res.json({ theme: (rows[0] && rows[0].theme) || {} });
}));

devThemeRoutes.post('/:store/reset', asyncHandler(async (req, res) => {
  const store = shopOf(req);
  await query('UPDATE site_content SET data = data - \'theme\', updated_at = now() WHERE storefront = $1', [store]);
  await audit(req, { action: 'theme.reset', entityType: 'site_content', entityId: store, actorUserId: req.user.id });
  res.json({ ok: true });
}));

devThemeRoutes.post('/:store', asyncHandler(async (req, res) => {
  const store = shopOf(req);
  const { theme } = parse(bodySchema, req.body);
  check(theme);
  await query(
    `INSERT INTO site_content (storefront, data, updated_by, updated_at)
     VALUES ($1, jsonb_build_object('theme', $2::jsonb), $3, now())
     ON CONFLICT (storefront) DO UPDATE
     SET data = jsonb_set(COALESCE(site_content.data, '{}'::jsonb), '{theme}', $2::jsonb, true), updated_by = $3, updated_at = now()`,
    [store, JSON.stringify(theme), String(req.user.id)]
  );
  await audit(req, { action: 'theme.saved', entityType: 'site_content', entityId: store, actorUserId: req.user.id, details: { keys: Object.keys(theme) } });
  res.json({ ok: true });
}));
