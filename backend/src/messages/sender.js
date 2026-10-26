import { query } from '../db/pool.js';

// Sends queued WhatsApp messages through OpenWA from inside the server.
// It only sends when app_settings.whatsapp_mode is "openwa". Set SENDER_DISABLED=1 to turn it off.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (msg) => console.log(JSON.stringify({ level: 'info', msg }));
let stopped = false;

export function stopSender() { stopped = true; }

export function startSender() {
  if (process.env.SENDER_DISABLED === '1') { log('WhatsApp sender is turned off (SENDER_DISABLED=1)'); return; }
  const BASE = (process.env.OPENWA_URL || '').replace(/\/+$/, '');
  const SESSION = process.env.OPENWA_SESSION || '';
  const KEY = process.env.OPENWA_KEY || '';
  const HEADER = process.env.OPENWA_KEY_HEADER || 'X-API-Key';
  if (!BASE || !SESSION || !KEY) { log('WhatsApp sender not started: OpenWA is not set in the environment'); return; }
  stopped = false;
  run(BASE, SESSION, KEY, HEADER).catch((e) => console.error('sender stopped: ' + e.message));
}

async function sendOne(BASE, SESSION, KEY, HEADER, row) {
  const res = await fetch(BASE + '/api/sessions/' + encodeURIComponent(SESSION) + '/messages/send-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [HEADER]: KEY },
    body: JSON.stringify({ chatId: row.to_phone + '@c.us', text: row.body }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 300));
}

async function run(BASE, SESSION, KEY, HEADER) {
  try { await query("UPDATE outbound_messages SET status = 'queued' WHERE status = 'sending'"); } catch (e) { /* retried below */ }
  log('WhatsApp sender started. Mode is read from the database every cycle.');
  let lastMode = '';
  while (!stopped) {
    try {
      const m = await query("SELECT value FROM app_settings WHERE key = 'whatsapp_mode'");
      const mode = m.rows[0] ? m.rows[0].value : 'direct';
      if (mode !== lastMode) { log('WhatsApp mode: ' + mode + (mode === 'openwa' ? ' (sending)' : ' (paused)')); lastMode = mode; }
      if (mode !== 'openwa') { await sleep(15000); continue; }
      await query("UPDATE outbound_messages SET status = 'failed', last_error = 'expired (older than 24 hours)' WHERE status = 'queued' AND created_at < now() - interval '24 hours'");
      const claim = await query("UPDATE outbound_messages SET status = 'sending' WHERE id = (SELECT id FROM outbound_messages WHERE status = 'queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING id, to_phone, body, attempts");
      const row = claim.rows[0];
      if (!row) { await sleep(10000); continue; }
      try {
        await sendOne(BASE, SESSION, KEY, HEADER, row);
        await query("UPDATE outbound_messages SET status = 'sent', sent_at = now(), last_error = NULL WHERE id = $1", [row.id]);
        log('WhatsApp sent #' + row.id);
        await sleep(3000 + Math.floor(Math.random() * 3000));
      } catch (e) {
        const n = row.attempts + 1;
        const next = n >= 3 ? 'failed' : 'queued';
        await query('UPDATE outbound_messages SET status = $2, attempts = $3, last_error = $4 WHERE id = $1', [row.id, next, n, String(e.message).slice(0, 400)]);
        log('WhatsApp problem #' + row.id + ' (try ' + n + '): ' + e.message + (next === 'failed' ? ' -> gave up' : ' -> will retry'));
        await sleep(30000);
      }
    } catch (e) {
      if (stopped) return;
      console.error('sender cycle error: ' + e.message);
      await sleep(30000);
    }
  }
}
