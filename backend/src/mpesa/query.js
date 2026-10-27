import { getToken, mpesaLive } from './daraja.js';

// Asks Safaricom directly whether this prompt succeeded. True only for ResultCode 0.
export async function verifyPaid(checkoutId) {
  const base = mpesaLive() ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
  for (let i = 0; i < 3; i++) {
    try {
      const token = await getToken();
      const stamp = new Date(Date.now() + 3 * 3600 * 1000).toISOString().replace(/\D/g, '').slice(0, 14);
      const code = process.env.MPESA_SHORTCODE;
      const password = Buffer.from(code + process.env.MPESA_PASSKEY + stamp).toString('base64');
      const r = await fetch(base + '/mpesa/stkpushquery/v1/query', {
        method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ BusinessShortCode: code, Password: password, Timestamp: stamp, CheckoutRequestID: checkoutId }),
        signal: AbortSignal.timeout(15000),
      });
      const j = await r.json().catch(() => ({}));
      if (j.ResultCode !== undefined && j.ResultCode !== null) return String(j.ResultCode) === '0';
    } catch (e) { console.warn('stk query try ' + (i + 1) + ': ' + e.message); }
    await new Promise((ok) => setTimeout(ok, 2500));
  }
  return false;
}
