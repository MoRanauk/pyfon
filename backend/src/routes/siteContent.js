import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncHandler } from '../errors.js';
import { audit } from '../audit.js';

const STORES = ['prestige', 'trim', 'mco', 'studio'];
const TOP = ['announce', 'home', 'msg', 'ctx', 'cities', 'words', 'theme', 'navOrder', 'layout', 'blocks', 'components', 'pages', 'customCss'];
const HEX = /^#[0-9a-f]{6}$/i;
const rowsOf = (r) => (r && r.rows) || (Array.isArray(r) ? r : []);
const bad = (res, m) => res.status(400).json({ error: { code: 'bad_request', message: m } });

function walk(v, d, k) {
  if (d > 6) throw new Error('Too many levels');
  if (typeof v === 'string') {
    const max = k === 'customCss' ? 6000 : 600;
    if (v.length > max) throw new Error('A text is too long (max ' + max + ' characters)');
    if (/^\s*(javascript|data|vbscript):/i.test(v)) throw new Error('That link type is not allowed');
    return v.trim();
  }
  if (Array.isArray(v)) {
    if (v.length > 60) throw new Error('A list has more than 60 items');
    return v.map((x) => walk(x, d + 1, k));
  }
  if (v && typeof v === 'object') {
    const ks = Object.keys(v);
    if (ks.length > 300) throw new Error('Too many entries');
    const o = {};
    for (const x of ks) {
      if (x === '__proto__' || x === 'constructor' || x === 'prototype' || x.length > 400) throw new Error('Bad key');
      o[x] = walk(v[x], d + 1, x);
    }
    return o;
  }
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  throw new Error('Unsupported value');
}
function checkTheme(t) {
  if (!t) return;
  for (const [k, v] of Object.entries(t)) {
    if (!/^--pf-[a-z0-9-]+$/.test(k)) throw new Error('Bad theme name');
    const ok = k === '--pf-font' ? /^[A-Za-z0-9 ,'"-]{1,100}$/.test(v) : k === '--pf-radius' ? /^\d{1,2}px$/.test(v) : HEX.test(v);
    if (!ok) throw new Error('Bad theme value for ' + k);
  }
}
function checkCss(s) {
  if (!s) return;
  if (/@import|javascript:|expression\s*\(|behavior\s*:|<|\\/.test(s) || /url\s*\(\s*['"]?(?!\/|https:\/\/|data:image\/)/i.test(s)) {
    throw new Error('That CSS has something not allowed (no @import, scripts, or unsafe links)');
  }
}
async function read(store) {
  const r = rowsOf(await query('SELECT data, updated_at FROM site_content WHERE storefront = $1', [store]));
  return r[0] || { data: {}, updated_at: null };
}
async function write(req, store, value, action) {
  const by = String((req.user && (req.user.id || req.user.sub)) || '');
  const json = JSON.stringify(value);
  await query(
    'INSERT INTO site_content (storefront, data, updated_by, updated_at) VALUES ($1, $2::jsonb, $3, now()) ON CONFLICT (storefront) DO UPDATE SET data = $2::jsonb, updated_by = $3, updated_at = now()',
    [store, json, by]
  );
  await query('INSERT INTO site_content_history (storefront, data, updated_by) VALUES ($1, $2::jsonb, $3)', [store, json, by]);
  await audit(req, { action, entityType: 'site_content', entityId: store, actorUserId: req.user.id, details: { keys: Object.keys(value) } });
}

export const publicContentRoutes = Router();
publicContentRoutes.get('/:store', asyncHandler(async (req, res) => {
  if (!STORES.includes(req.params.store)) return res.status(404).json({ error: { code: 'not_found', message: 'Unknown shop' } });
  const r = await read(req.params.store);
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ data: r.data || {} });
}));

export const partnerContentRoutes = Router();
partnerContentRoutes.get('/:store', asyncHandler(async (req, res) => {
  if (!STORES.includes(req.params.store)) return bad(res, 'Unknown shop');
  const r = await read(req.params.store);
  res.json({ data: r.data || {}, updatedAt: r.updated_at });
}));
partnerContentRoutes.put('/:store', asyncHandler(async (req, res) => {
  const store = req.params.store;
  if (!STORES.includes(store)) return bad(res, 'Unknown shop');
  const raw = req.body && req.body.data;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad(res, 'Send an object called data');
  if (Object.keys(raw).some((k) => !TOP.includes(k))) return bad(res, 'Unknown section');
  let value;
  try {
    value = walk(raw, 0, '');
    checkTheme(value.theme);
    checkCss(value.customCss);
    if (JSON.stringify(value).length > 90000) throw new Error('Too much content on one save');
  } catch (e) { return bad(res, e.message); }
  await write(req, store, value, 'site.content_saved');
  res.json({ data: value });
}));
partnerContentRoutes.get('/:store/history', asyncHandler(async (req, res) => {
  if (!STORES.includes(req.params.store)) return bad(res, 'Unknown shop');
  const r = rowsOf(await query('SELECT id, updated_by, at FROM site_content_history WHERE storefront = $1 ORDER BY id DESC LIMIT 30', [req.params.store]));
  res.json({ history: r.map((x) => ({ id: String(x.id), by: x.updated_by, at: x.at })) });
}));
partnerContentRoutes.post('/:store/restore/:id', asyncHandler(async (req, res) => {
  const store = req.params.store;
  if (!STORES.includes(store) || !/^\d{1,18}$/.test(req.params.id)) return bad(res, 'Bad request');
  const r = rowsOf(await query('SELECT data FROM site_content_history WHERE id = $1 AND storefront = $2', [req.params.id, store]));
  if (!r[0]) return res.status(404).json({ error: { code: 'not_found', message: 'Version not found' } });
  await write(req, store, r[0].data, 'site.content_restored');
  res.json({ data: r[0].data });
}));
