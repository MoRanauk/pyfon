import { HttpError } from '../errors.js';

// TextBee sends SMS through an Android phone. Keys come from backend\.env only.
const base = () => (process.env.TEXTBEE_BASE_URL || 'https://api.textbee.dev/api/v1').replace(/\/+$/, '');

export function textbeeReady() {
  return Boolean(process.env.TEXTBEE_API_KEY);
}

export async function sendTextbeeSms(phoneDigits, text) {
  const key = process.env.TEXTBEE_API_KEY;
  if (!key) throw new HttpError(503, 'sms_not_set_up', 'SMS (TextBee) is not set up in backend\\.env');
  const device = process.env.TEXTBEE_DEVICE_ID;
  const url = base() + (device ? '/gateway/devices/' + encodeURIComponent(device) + '/send-sms' : '/gateway/send-sms');
  let r;
  try {
    r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
      body: JSON.stringify({ recipients: ['+' + String(phoneDigits).replace(/\D/g, '')], message: text }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) { throw new HttpError(502, 'send_failed', 'Could not reach TextBee: ' + e.message); }
  if (!r.ok) {
    const why = (await r.text().catch(() => '')).slice(0, 200);
    throw new HttpError(502, 'send_failed', 'TextBee said HTTP ' + r.status + (why ? ': ' + why : ''));
  }
  return true;
}
