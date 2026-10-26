import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { sendEmail, maskEmail, maskPhone } from '../mail.js';
import { toWaNumber } from '../messages/queue.js';
import { sendTextbeeSms, textbeeReady } from '../messages/textbee.js';
import { channelStatus } from '../messages/channels.js';

export const partnerSendRoutes = Router();
const me = (req) => req.user.id || req.user.sub;
const schema = z.object({
  channel: z.enum(['email', 'sms', 'whatsapp']),
  to: z.object({
    name: z.string().trim().max(150).default(''),
    phone: z.string().trim().max(40).optional(),
    email: z.string().trim().email().max(150).optional(),
  }),
  text: z.string().trim().min(1).max(2000),
  files: z.array(z.object({ name: z.string().trim().max(200), url: z.string().url().max(1000) })).max(5).default([]),
});

const recent = new Map();
function limit(uid) {
  const now = Date.now();
  const list = (recent.get(uid) || []).filter((t) => now - t < 600000);
  if (list.length >= 30) throw new HttpError(429, 'slow_down', 'Too many messages. Wait a few minutes.');
  list.push(now);
  recent.set(uid, list);
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function deliver(b, full) {
  if (b.channel === 'email') {
    if (!b.to.email) throw new HttpError(400, 'bad_request', 'This person has no email saved');
    const links = b.files.map((f) => '<li><a href="' + esc(f.url) + '">' + esc(f.name) + '</a></li>').join('');
    const html = '<p>' + esc(b.text).replace(/\n/g, '<br>') + '</p>' + (links ? '<ul>' + links + '</ul>' : '') + '<p>Pyfon Brands</p>';
    const ok = await sendEmail({ to: b.to.email, subject: 'Message from Pyfon Brands', text: full, html });
    if (!ok) throw new HttpError(502, 'send_failed', 'The email was not sent. Check the Brevo settings in backend\\.env');
    return b.to.email;
  }
  if (!b.to.phone) throw new HttpError(400, 'bad_request', 'This person has no phone number saved');
  const to = toWaNumber(b.to.phone);
  if (to.length < 10) throw new HttpError(400, 'bad_request', 'That phone number looks too short');
  if (b.channel === 'whatsapp') {
    const base = (process.env.OPENWA_URL || '').replace(/\/+$/, '');
    const session = process.env.OPENWA_SESSION || '';
    const key = process.env.OPENWA_KEY || '';
    const header = process.env.OPENWA_KEY_HEADER || 'X-API-Key';
    if (!base || !session || !key) throw new HttpError(503, 'wa_not_set_up', 'WhatsApp (OpenWA) is not set up in backend\\.env');
    let r;
    try {
      r = await fetch(base + '/api/sessions/' + encodeURIComponent(session) + '/messages/send-text', {
        method: 'POST', headers: { 'Content-Type': 'application/json', [header]: key },
        body: JSON.stringify({ chatId: to + '@c.us', text: full }), signal: AbortSignal.timeout(15000),
      });
    } catch (e) { throw new HttpError(502, 'send_failed', 'Could not reach OpenWA: ' + e.message); }
    if (!r.ok) { const why = (await r.text().catch(() => '')).slice(0, 200); throw new HttpError(502, 'send_failed', 'OpenWA said HTTP ' + r.status + (why ? ': ' + why : '')); }
    return to;
  }
  if (textbeeReady()) { await sendTextbeeSms(to, full); return to; }
  const url = process.env.SMS_GATEWAY_URL;
  const gkey = process.env.SMS_GATEWAY_KEY;
  if (!url || !gkey) throw new HttpError(503, 'sms_not_set_up', 'The SMS gateway is not set up yet. Add SMS_GATEWAY_URL and SMS_GATEWAY_KEY to backend\\.env');
  let r;
  try {
    r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + gkey },
      body: JSON.stringify({ to: '+' + to, phoneNumbers: ['+' + to], message: full, text: full }), signal: AbortSignal.timeout(15000),
    });
  } catch (e) { throw new HttpError(502, 'send_failed', 'Could not reach the SMS gateway: ' + e.message); }
  if (!r.ok) throw new HttpError(502, 'send_failed', 'The SMS gateway said HTTP ' + r.status);
  return to;
}

partnerSendRoutes.post('/connect/send', asyncHandler(async (req, res) => {
  const b = parse(schema, req.body);
  const uid = me(req);
  limit(uid);
  const full = b.text + (b.files.length ? '\n\n' + b.files.map((f) => f.name + ': ' + f.url).join('\n') : '');
  let target = '';
  let error = null;
  try { target = await deliver(b, full); } catch (e) { error = e; }
  const logTo = target || b.to.email || b.to.phone || 'unknown';
  const shown = b.channel === 'email' ? maskEmail(logTo) : maskPhone(logTo);
  const status = error ? 'failed' : 'sent';
  try {
    await pool.query(
      "INSERT INTO outbound_messages (kind, to_phone, body, status, attempts, last_error, sent_at, channel, sent_by, to_name) VALUES ('custom', $1, $2, $3::text, 1, $4, CASE WHEN $3::text = 'sent' THEN now() END, $5, $6, $7)",
      [logTo, full, status, error ? String(error.message).slice(0, 300) : null, b.channel, uid, b.to.name]);
  } catch (e) { console.error('connect log failed: ' + e.message); }
  try {
    await pool.query(
      "INSERT INTO audit_log (request_id, interface, actor_user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, 'connect.sent', $4, $5, $6)",
      [req.requestId || req.id || null, req.user.interface || null, uid, b.channel, shown, JSON.stringify({ name: b.to.name, status })]);
  } catch (e) { console.error('connect audit failed: ' + e.message); }
  if (error) throw error;
  res.json({ ok: true });
}));

// Which channels are set up (used by the Connect page).
partnerSendRoutes.get('/connect/channels', asyncHandler(async (req, res) => {
  const m = await pool.query("SELECT value FROM app_settings WHERE key = 'whatsapp_mode'");
  res.json(channelStatus(m.rows[0] ? m.rows[0].value : 'direct'));
}));
