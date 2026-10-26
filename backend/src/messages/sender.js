import { query } from '../db/pool.js';
import { openwaReady, smsReady, emailFallbackOn, sendOpenwa, sendSmsGateway, sendEmailFallback } from './channels.js';

// Sends queued messages from inside the server.
// Order for every message: WhatsApp (OpenWA, only when app_settings.whatsapp_mode is "openwa"),
// then the SMS gateway, then email as the safety net. A channel that is not set up is skipped.
// Set SENDER_DISABLED=1 to turn the sender off. Set MESSAGE_EMAIL_FALLBACK=0 to turn the email safety net off.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (msg) => console.log(JSON.stringify({ level: 'info', msg }));
const IDLE_MS = 10 * 60 * 1000;
// Kinds that their own route already emails, so the safety net must not email them twice.
const ALREADY_EMAILED = ['payment_received'];
let stopped = false;
let wake = null;

const nap = (ms) => new Promise((resolve) => {
  const done = () => { clearTimeout(t); wake = null; resolve(); };
  const t = setTimeout(done, ms);
  wake = done;
});

// Called (a few seconds after a message is queued) so it goes out at once instead of waiting.
export function kickSender() { if (wake) wake(); }
export function stopSender() { stopped = true; kickSender(); }

export function startSender() {
  if (process.env.SENDER_DISABLED === '1') { log('Message sender is turned off (SENDER_DISABLED=1)'); return; }
  stopped = false;
  run().catch((e) => console.error('sender stopped: ' + e.message));
}

async function run() {
  try { await query("UPDATE outbound_messages SET status = 'queued' WHERE status = 'sending'"); } catch (e) { /* retried below */ }
  log('Message sender started: OpenWA, then SMS, then email. Settings are read every cycle.');
  let last = '';
  while (!stopped) {
    try {
      const m = await query("SELECT value FROM app_settings WHERE key = 'whatsapp_mode'");
      const mode = m.rows[0] ? m.rows[0].value : 'direct';
      const openwa = mode === 'openwa' && openwaReady();
      const sms = smsReady();
      const email = emailFallbackOn();
      const state = (openwa ? 'openwa' : 'no-openwa(' + mode + ')') + ' ' + (sms ? 'sms' : 'no-sms') + ' ' + (email ? 'email' : 'no-email');
      if (state !== last) { log('Message channels: ' + state); last = state; }
      await query("UPDATE outbound_messages SET status = 'failed', last_error = 'expired (older than 24 hours)' WHERE status = 'queued' AND created_at < now() - interval '24 hours'");
      const phoneOk = openwa || sms;
      if (!phoneOk && !email) { await nap(IDLE_MS); continue; }
      const emailRow = "(m.order_id IS NOT NULL AND m.kind::text <> ALL($1::text[]) AND EXISTS (SELECT 1 FROM orders o WHERE o.id = m.order_id AND COALESCE(o.contact_email, '') <> ''))";
      const claim = await query(
        "UPDATE outbound_messages SET status = 'sending' WHERE id = (SELECT m.id FROM outbound_messages m WHERE m.status = 'queued' AND " + (phoneOk ? 'TRUE' : emailRow) + " ORDER BY m.created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING id, kind, to_phone, body, attempts, order_id",
        phoneOk ? [] : [ALREADY_EMAILED]
      );
      const row = claim.rows[0];
      if (!row) { await nap(IDLE_MS); continue; }
      const errs = [];
      let used = '';
      if (openwa) {
        try { await sendOpenwa(row.to_phone, row.body); used = 'whatsapp'; } catch (e) { errs.push('OpenWA: ' + e.message); }
      }
      if (!used && sms) {
        try { await sendSmsGateway(row.to_phone, row.body); used = 'sms'; } catch (e) { errs.push('SMS: ' + e.message); }
      }
      if (!used && email && row.order_id && !ALREADY_EMAILED.includes(String(row.kind))) {
        try {
          const o = await query('SELECT ref, storefront_code, contact_email FROM orders WHERE id = $1', [row.order_id]);
          const r = o.rows[0];
          if (!r || !r.contact_email) errs.push('Email: no email address on the order');
          else { await sendEmailFallback({ email: r.contact_email, ref: r.ref, storefront: r.storefront_code, text: row.body }); used = 'email'; }
        } catch (e) { errs.push('Email: ' + e.message); }
      }
      if (used) {
        await query("UPDATE outbound_messages SET status = 'sent', sent_at = now(), last_error = NULL, channel = $2 WHERE id = $1", [row.id, used]);
        log('Message sent #' + row.id + ' by ' + used + (errs.length ? ' (after: ' + errs.join(' | ') + ')' : ''));
        await sleep(3000 + Math.floor(Math.random() * 3000));
      } else {
        const n = row.attempts + 1;
        const next = n >= 3 ? 'failed' : 'queued';
        const why = (errs.join(' | ') || 'no channel could send this message').slice(0, 400);
        await query('UPDATE outbound_messages SET status = $2, attempts = $3, last_error = $4 WHERE id = $1', [row.id, next, n, why]);
        log('Message problem #' + row.id + ' (try ' + n + '): ' + why + (next === 'failed' ? ' -> gave up' : ' -> will retry'));
        await sleep(30000);
      }
    } catch (e) {
      if (stopped) return;
      console.error('sender cycle error: ' + e.message);
      await sleep(30000);
    }
  }
}
