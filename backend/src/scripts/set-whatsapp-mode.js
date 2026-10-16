import { query } from '../db/pool.js';

// Flips how WhatsApp messages are routed.
// From backend: node --env-file=.env src/scripts/set-whatsapp-mode.js openwa
//               node --env-file=.env src/scripts/set-whatsapp-mode.js direct
//               node --env-file=.env src/scripts/set-whatsapp-mode.js        (shows current mode)
const want = process.argv[2];
if (want && want !== 'openwa' && want !== 'direct') {
  console.error('Use "openwa" or "direct".');
  process.exit(1);
}
if (want) {
  await query(
    `INSERT INTO app_settings (key, value, updated_by) VALUES ('whatsapp_mode', $1, 'script')
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = 'script'`,
    [want]
  );
}
const r = await query(`SELECT value FROM app_settings WHERE key = 'whatsapp_mode'`);
console.log('WhatsApp mode is now: ' + (r.rows[0] ? r.rows[0].value : 'direct'));
process.exit(0);
