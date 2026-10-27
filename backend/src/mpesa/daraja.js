import { HttpError } from '../errors.js';

export const mpesaLive = () => process.env.MPESA_ENV === 'live';
const base = () => (mpesaLive() ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke');

export function stkReady() {
  const e = process.env;
  return Boolean(e.MPESA_CONSUMER_KEY && e.MPESA_CONSUMER_SECRET && e.MPESA_PASSKEY && e.MPESA_SHORTCODE
    && e.MPESA_CALLBACK_BASE && e.MPESA_CALLBACK_SECRET && (!mpesaLive() || e.MPESA_TILL));
}

export function normalizePhone(raw) {
  const d = String(raw || '').replace(/[\s\-()]/g, '').replace(/^\+/, '');
  let n = null;
  if (/^0[17]\d{8}$/.test(d)) n = '254' + d.slice(1);
  else if (/^254[17]\d{8}$/.test(d)) n = d;
  else if (/^[17]\d{8}$/.test(d)) n = '254' + d;
  return n;
}

let cached = { token: null, until: 0 };
export async function getToken() {
  if (cached.token && Date.now() < cached.until) return cached.token;
  const auth = Buffer.from(process.env.MPESA_CONSUMER_KEY + ':' + process.env.MPESA_CONSUMER_SECRET).toString('base64');
  const r = await fetch(base() + '/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: 'Basic ' + auth }, signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new HttpError(502, 'mpesa_token', 'M-Pesa token request failed (' + r.status + ')');
  const j = await r.json();
  if (!j.access_token) throw new HttpError(502, 'mpesa_token', 'M-Pesa gave no token');
  cached = { token: j.access_token, until: Date.now() + 3300 * 1000 };
  return cached.token;
}

export async function stkPush({ phone, amountKes, accountRef }) {
  const token = await getToken();
  const stamp = new Date(Date.now() + 3 * 3600 * 1000).toISOString().replace(/\D/g, '').slice(0, 14);
  const code = process.env.MPESA_SHORTCODE;
  const password = Buffer.from(code + process.env.MPESA_PASSKEY + stamp).toString('base64');
  const live = mpesaLive();
  const body = {
    BusinessShortCode: code,
    Password: password,
    Timestamp: stamp,
    TransactionType: live ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline',
    Amount: amountKes,
    PartyA: phone,
    PartyB: live ? process.env.MPESA_TILL : code,
    PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_BASE.replace(/\/+$/, '') + '/v1/mpesa/callback/' + process.env.MPESA_CALLBACK_SECRET,
    AccountReference: String(accountRef).slice(0, 12),
    TransactionDesc: 'Pyfon order',
  };
  const r = await fetch(base() + '/mpesa/stkpush/v1/processrequest', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || String(j.ResponseCode) !== '0' || !j.CheckoutRequestID) {
    throw new HttpError(502, 'mpesa_push', 'STK push refused: ' + String(j.errorMessage || j.ResponseDescription || r.status).slice(0, 160));
  }
  return { checkoutRequestId: j.CheckoutRequestID, merchantRequestId: j.MerchantRequestID || null };
}
