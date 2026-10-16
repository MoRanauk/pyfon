import { query } from '../db/pool.js';

// Sends queued WhatsApp messages through OpenWA, only when the mode is "openwa".
// From backend:
//   node --env-file=.env src/scripts/whatsapp-sender.js          (keeps running; Ctrl+C stops)
//   node --env-file=.env src/scripts/whatsapp-sender.js --once   (one pass, then exits)
//   node --env-file=.env src/scripts/whatsapp-sender.js --list   (shows waiting messages)
const args = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (args.includes('--list')) {
  const { rows } = await query(
    `SELECT id, kind, to_phone, status, attempts, last_error, body FROM outbound_messages
      WHERE status IN ('queued','sending','failed') ORDER BY created_at LIMIT 50`
  );
  if (!rows.length) console.log('Nothing waiting to be sent.');
  for (const r of rows) {
    console.log('#' + r.id + ' [' + r.status + ', tries ' + r.attempts + '] ' + r.kind + ' to ' + r.to_phone + (r.last_error ? ' | ' + r.last_error : ''));
    console.log('   ' + r.body);
  }
  process.exit(0);
}

const BASE = (process.env.OPENWA_URL || '').replace(/\/+$/, '');
const SESSION = process.env.OPENWA_SESSION || '';
const KEY = process.env.OPENWA_KEY || '';
const HEADER = process.env.OPENWA_KEY_HEADER || 'X-API-Key';
if (!BASE || !SESSION || !KEY) {
  console.error('Missing OPENWA_URL, OPENWA_SESSION or OPENWA_KEY in backend\\.env');
  process.exit(1);
}
const ONCE = args.includes('--once');

async function getMode() {
  const r = await query(`SELECT value FROM app_settings WHERE key = 'whatsapp_mode'`);
  return r.rows[0] ? r.rows[0].value : 'direct';
}

async function sendOne(row) {
  const res = await fetch(BASE + '/api/sessions/' + encodeURIComponent(SESSION) + '/messages/send-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [HEADER]: KEY },
    body: JSON.stringify({ chatId: row.to_phone + '@c.us', text: row.body }),
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) {
    const t = (await res.text()).slice(0, 300);
    throw new Error('HTTP ' + res.status + ' ' + t);
  }
}

// A crash can leave rows stuck on "sending"; put them back in line.
await query(`UPDATE outbound_messages SET status = 'queued' WHERE status = 'sending'`);
console.log('Sender started. Mode is read from the database every cycle.');
let lastMode = '';

while (true) {
  const mode = await getMode();
  if (mode !== lastMode) { console.log('Mode: ' + mode + (mode === 'openwa' ? ' (sending)' : ' (paused, customers use the WhatsApp button)')); lastMode = mode; }
  if (mode !== 'openwa') {
    if (ONCE) break;
    await sleep(15000);
    continue;
  }
  await query(
    `UPDATE outbound_messages SET status = 'failed', last_error = 'expired (older than 24 hours)'
      WHERE status = 'queued' AND created_at < now() - interval '24 hours'`
  );
  const claim = await query(
    `UPDATE outbound_messages SET status = 'sending'
      WHERE id = (SELECT id FROM outbound_messages WHERE status = 'queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
      RETURNING id, to_phone, body, attempts`
  );
  const row = claim.rows[0];
  if (!row) {
    if (ONCE) break;
    await sleep(10000);
    continue;
  }
  try {
    await sendOne(row);
    await query(`UPDATE outbound_messages SET status = 'sent', sent_at = now(), last_error = NULL WHERE id = $1`, [row.id]);
    console.log('Sent #' + row.id + ' to ' + row.to_phone);
    await sleep(3000 + Math.floor(Math.random() * 3000));
  } catch (e) {
    const n = row.attempts + 1;
    const next = n >= 3 ? 'failed' : 'queued';
    await query(`UPDATE outbound_messages SET status = $2, attempts = $3, last_error = $4 WHERE id = $1`, [row.id, next, n, String(e.message).slice(0, 400)]);
    console.log('Problem with #' + row.id + ' (try ' + n + '): ' + e.message + (next === 'failed' ? ' -> gave up' : ' -> will retry'));
    await sleep(30000);
  }
}
process.exit(0);
