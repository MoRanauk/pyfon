const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const errors = [];
const writes = [];

function whole(file, content, mustExist) {
  const p = path.join(root, file);
  if (mustExist && !fs.existsSync(p)) { errors.push('MISSING FILE ' + file); return; }
  writes.push({ p, text: content, label: file + ' (written)' });
}

function edit(file, pairs) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) { errors.push('MISSING FILE ' + file); return; }
  const raw = fs.readFileSync(p, 'utf8');
  const crlf = raw.includes('\r\n');
  let t = raw.replace(/\r\n/g, '\n');
  let changed = 0;
  for (const [o, n] of pairs) {
    if (t.includes(n)) continue;
    const c = t.split(o).length - 1;
    if (c !== 1) { errors.push('NOT FOUND (' + c + ') in ' + file + ': ' + o.slice(0, 70).replace(/\n/g, ' ')); continue; }
    t = t.split(o).join(n);
    changed++;
  }
  writes.push({ p, text: crlf ? t.replace(/\n/g, '\r\n') : t, label: file + (changed ? ' (patched ' + changed + ')' : ' (already done)') });
}

whole('backend/src/messages/channels.js', String.raw`import { sendEmail } from '../mail.js';
import { SHOP_NAMES } from '../delivery.js';

// One place that knows how a message can leave the server.
// Order: WhatsApp (OpenWA), then the SMS gateway, then email. Each is used only when it is set up.
const trim = (u) => String(u || '').replace(/\/+$/, '');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const openwaReady = () => Boolean(process.env.OPENWA_URL && process.env.OPENWA_SESSION && process.env.OPENWA_KEY);
export const smsReady = () => Boolean(process.env.SMS_GATEWAY_URL && process.env.SMS_GATEWAY_KEY);
export const emailReady = () => Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
// Email is the safety net. Set MESSAGE_EMAIL_FALLBACK=0 to turn it off.
export const emailFallbackOn = () => emailReady() && process.env.MESSAGE_EMAIL_FALLBACK !== '0';

export async function sendOpenwa(phone, text) {
  const header = process.env.OPENWA_KEY_HEADER || 'X-API-Key';
  const res = await fetch(trim(process.env.OPENWA_URL) + '/api/sessions/' + encodeURIComponent(process.env.OPENWA_SESSION) + '/messages/send-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [header]: process.env.OPENWA_KEY },
    body: JSON.stringify({ chatId: phone + '@c.us', text }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text().catch(() => '')).slice(0, 200));
}

export async function sendSmsGateway(phone, text) {
  const res = await fetch(process.env.SMS_GATEWAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.SMS_GATEWAY_KEY },
    body: JSON.stringify({ to: '+' + phone, phoneNumbers: ['+' + phone], message: text, text }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
}

export async function sendEmailFallback({ email, ref, storefront, text }) {
  const shop = SHOP_NAMES[storefront] || 'Pyfon Brands';
  const html = '<p>' + esc(text).replace(/\n/g, '<br>') + '</p><p>' + esc(shop) + '</p>';
  const ok = await sendEmail({ to: email, subject: 'Your order ' + ref + ' from ' + shop, text, html, fromName: shop });
  if (!ok) throw new Error('the email was not sent (check the Brevo settings)');
}

export function channelStatus(mode) {
  return {
    order: ['whatsapp', 'sms', 'email'],
    whatsapp: { configured: openwaReady(), mode, sending: openwaReady() && mode === 'openwa' },
    sms: { configured: smsReady() },
    email: { configured: emailReady(), fallback: emailFallbackOn() },
  };
}
`, false);

whole('backend/src/messages/sender.js', String.raw`import { query } from '../db/pool.js';
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
`, true);

whole('backend/src/messages/queue.js', String.raw`import { kickSender } from './sender.js';

// Message queue. Orders add a row here; the sender in sender.js sends the rows.

// 0712 345 678, +254712345678 and 712345678 all become 254712345678.
export function toWaNumber(raw) {
  let d = String(raw || '').replace(/[^0-9]/g, '');
  if (d.startsWith('0')) d = '254' + d.slice(1);
  else if (d.length === 9 && (d.startsWith('7') || d.startsWith('1'))) d = '254' + d;
  return d;
}

export async function enqueueMessage(client, { kind, phone, body, orderId = null, quoteRequestId = null }) {
  const to = toWaNumber(phone);
  if (to.length < 10) return null;
  await client.query(
    ` + '`' + String.raw`INSERT INTO outbound_messages (kind, to_phone, body, order_id, quote_request_id) VALUES ($1, $2, $3, $4, $5)` + '`' + String.raw`,
    [kind, to, body, orderId, quoteRequestId]
  );
  setTimeout(kickSender, 3000);
  return to;
}
`, true);

edit('backend/src/routes/partnerSend.js', [
  [`import { sendTextbeeSms, textbeeReady } from '../messages/textbee.js';`,
   `import { sendTextbeeSms, textbeeReady } from '../messages/textbee.js';\nimport { channelStatus } from '../messages/channels.js';`],
  [`  res.json({ ok: true });\n}));`,
   `  res.json({ ok: true });\n}));\n\n// Which channels are set up (used by the Connect page).\npartnerSendRoutes.get('/connect/channels', asyncHandler(async (req, res) => {\n  const m = await pool.query("SELECT value FROM app_settings WHERE key = 'whatsapp_mode'");\n  res.json(channelStatus(m.rows[0] ? m.rows[0].value : 'direct'));\n}));`],
]);

if (errors.length) { errors.forEach((e) => console.log(e)); console.log('FAIL: nothing written'); process.exit(1); }
for (const w of writes) { fs.mkdirSync(path.dirname(w.p), { recursive: true }); fs.writeFileSync(w.p, w.text, 'utf8'); console.log('Patched ' + w.label); }
console.log('PASS: G4 channels patched');
