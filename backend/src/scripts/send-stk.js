import { query } from '../db/pool.js';
import { startPrompt } from '../mpesa/stk.js';
const [ref, phone, amt] = process.argv.slice(2);
if (!ref || !phone) { console.log('Use: node --env-file=.env src\\scripts\\send-stk.js ORD-000050 0712345678 [amount]'); process.exit(1); }
const { rows } = await query('SELECT id, ref, total_kes, status, customer_id FROM orders WHERE ref = $1', [ref]);
if (!rows[0]) { console.log('Order not found'); process.exit(1); }
try {
  const r = await startPrompt(rows[0], rows[0].customer_id, phone, amt ? Number(amt) : undefined);
  console.log('Sent. CheckoutRequestID: ' + r.checkoutRequestId + '  amount: ' + r.amountKes);
} catch (e) { console.log('FAIL: ' + e.message); process.exit(1); }
process.exit(0);
