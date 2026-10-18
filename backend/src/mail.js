// Brevo helpers (HTTPS API; Render blocks normal email ports).
// Email needs BREVO_API_KEY and BREVO_SENDER_EMAIL (a sender you verified in Brevo).
// SMS needs BREVO_SMS_SENDER (up to 11 letters or digits) and SMS credits in Brevo.
// WhatsApp needs BREVO_WA_SENDER (the WhatsApp number linked in Brevo, with country code) and BREVO_WA_TEMPLATE_ID.
const BASE = 'https://api.brevo.com/v3';
const key = () => process.env.BREVO_API_KEY;

// Kenyan numbers only: 07xx, 01xx, 2547xx or +2547xx. Returns +254XXXXXXXXX or null.
export function normalizePhone(raw) {
  const d = String(raw || '').replace(/[\s\-().]/g, '');
  const m = d.match(/^(?:\+?254|0)([17]\d{8})$/);
  return m ? '+254' + m[1] : null;
}

export function maskEmail(email) {
  const [local = '', domain = ''] = String(email).toLowerCase().split('@');
  const keep = (s) => (s.length <= 4 ? s.slice(0, 1) + '***' : s.slice(0, 2) + '***' + s.slice(-2));
  const dot = domain.lastIndexOf('.');
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : '';
  return keep(local) + '@' + host.slice(0, 1) + '***' + tld;
}

export function maskPhone(phone) {
  const d = String(phone).replace(/\D/g, '');
  return '+' + d.slice(0, 4) + '*'.repeat(Math.max(d.length - 6, 3)) + d.slice(-2);
}

// Which ways of sending a code are set up. Email is always listed.
export function resetChannels() {
  const out = ['email'];
  if (key() && process.env.BREVO_SMS_SENDER) out.push('sms');
  if (key() && process.env.BREVO_WA_SENDER && process.env.BREVO_WA_TEMPLATE_ID) out.push('whatsapp');
  return out;
}

async function brevo(path, body) {
  try {
    const r = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'api-key': key(), 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 300);
      console.error(JSON.stringify({ level: 'error', message: 'Brevo refused ' + path, status: r.status, detail }));
      return false;
    }
    return true;
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', message: 'Brevo call failed: ' + (err && err.message) }));
    return false;
  }
}

export async function sendEmail({ to, subject, text }) {
  const from = process.env.BREVO_SENDER_EMAIL;
  if (!key() || !from) {
    console.warn(JSON.stringify({ level: 'warn', message: 'Email not configured, nothing sent', to, subject }));
    if (process.env.NODE_ENV !== 'production') console.log('EMAIL TO ' + to + ' | ' + subject + ' | ' + text);
    return false;
  }
  return brevo('/smtp/email', {
    sender: { name: process.env.BREVO_SENDER_NAME || 'Pyfon Brands', email: from },
    to: [{ email: to }],
    subject,
    textContent: text,
  });
}

export async function sendSms({ to, text }) {
  const sender = process.env.BREVO_SMS_SENDER;
  if (!key() || !sender) return false;
  return brevo('/transactionalSMS/send', { sender, recipient: String(to).replace(/^\+/, ''), content: text, type: 'transactional' });
}

export async function sendWhatsApp({ to, code }) {
  const sender = process.env.BREVO_WA_SENDER;
  const templateId = Number(process.env.BREVO_WA_TEMPLATE_ID);
  if (!key() || !sender || !templateId) return false;
  return brevo('/whatsapp/sendMessage', {
    templateId,
    senderNumber: sender,
    contactNumbers: [String(to).replace(/^\+/, '')],
    params: { CODE: code },
  });
}
