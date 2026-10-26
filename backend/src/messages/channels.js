import { sendEmail } from '../mail.js';
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
