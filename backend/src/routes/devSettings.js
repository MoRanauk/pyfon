import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { audit } from '../audit.js';
import { asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';

// Developer-only settings. Mounted under /v1/dev/settings.
export const devSettingsRoutes = Router();
devSettingsRoutes.use(authenticate, requireRole('developer'));

const modeSchema = z.object({ mode: z.enum(['direct', 'openwa']) });

async function currentMode() {
  const r = await query(`SELECT value FROM app_settings WHERE key = 'whatsapp_mode'`);
  return r.rows[0] ? r.rows[0].value : 'direct';
}

// GET /v1/dev/settings/whatsapp-mode   ->  { "mode": "direct" }
devSettingsRoutes.get('/whatsapp-mode', asyncHandler(async (req, res) => {
  res.json({ mode: await currentMode() });
}));

// PUT /v1/dev/settings/whatsapp-mode   body: { "mode": "openwa" }
devSettingsRoutes.put('/whatsapp-mode', asyncHandler(async (req, res) => {
  const { mode } = parse(modeSchema, req.body);
  const before = await currentMode();
  await query(
    `INSERT INTO app_settings (key, value, updated_by) VALUES ('whatsapp_mode', $1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = EXCLUDED.updated_by`,
    [mode, req.user.email]
  );
  await audit(req, {
    action: 'settings.whatsapp_mode_changed',
    entityType: 'setting',
    entityId: 'whatsapp_mode',
    actorUserId: req.user.id,
    details: { from: before, to: mode }
  });
  res.json({ mode });
}));
