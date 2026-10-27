import { stkReady, mpesaLive, getToken } from '../mpesa/daraja.js';
const need = ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_PASSKEY', 'MPESA_SHORTCODE', 'MPESA_CALLBACK_BASE', 'MPESA_CALLBACK_SECRET'];
if (mpesaLive()) need.push('MPESA_TILL');
const missing = need.filter((n) => !process.env[n]);
console.log('Mode: ' + (mpesaLive() ? 'LIVE' : 'sandbox'));
if (missing.length) console.log('Missing in .env: ' + missing.join(', '));
console.log('stkReady: ' + stkReady());
try { await getToken(); console.log('Token PASS'); } catch (e) { console.log('Token FAIL: ' + e.message); process.exit(1); }
process.exit(0);
