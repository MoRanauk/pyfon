import { query } from '../db/pool.js';
import { HttpError } from '../errors.js';
import { stkReady, normalizePhone, stkPush, mpesaLive } from './daraja.js';

const kes = (n) => 'KES ' + Number(n).toLocaleString('en-KE');

// o = { id, ref, total_kes, status }. The caller already checked who owns the order.
export async function startPrompt(o, userId, phoneRaw, amountReq) {
  if (!stkReady()) throw new HttpError(503, 'prompt_unavailable', 'M-Pesa prompts are not switched on yet. Please pay to the till.');
  if (o.status === 'cancelled') throw new HttpError(409, 'order_cancelled', 'This order is cancelled');
  const phone = normalizePhone(phoneRaw);
  if (!phone) throw new HttpError(400, 'bad_phone', 'Type a Safaricom number like 0712345678.');
  const s = await query("SELECT COALESCE(sum(amount_kes), 0)::int AS paid FROM order_payments WHERE order_id = $1 AND status = 'confirmed'", [o.id]);
  const due = o.total_kes - s.rows[0].paid;
  if (due <= 0) throw new HttpError(409, 'already_paid', 'This order is already fully paid');
  const amount = amountReq || due;
  if (!Number.isInteger(amount) || amount < 1) throw new HttpError(400, 'bad_amount', 'The amount must be a whole number of shillings');
  if (amount > due) throw new HttpError(400, 'amount_too_big', 'The amount is more than the ' + kes(due) + ' still due');
  const pend = await query("SELECT 1 FROM mpesa_stk_requests r JOIN order_payments p ON p.id = r.payment_id WHERE p.order_id = $1 AND r.result_code IS NULL AND r.created_at > now() - interval '2 minutes' LIMIT 1", [o.id]);
  if (pend.rows[0]) throw new HttpError(409, 'prompt_pending', 'A prompt was just sent. Check your phone.');
  const wait = await query("SELECT count(*)::int AS n FROM order_payments WHERE order_id = $1 AND status = 'awaiting'", [o.id]);
  if (wait.rows[0].n >= 3) throw new HttpError(409, 'too_many_waiting', 'You already have payments waiting to be checked for this order.');
  const ins = await query(
    "INSERT INTO order_payments (order_id, method, status, claimed_amount_kes, created_by) VALUES ($1, 'mpesa_prompt', 'awaiting', $2, $3) RETURNING id",
    [o.id, amount, userId]
  );
  const payId = ins.rows[0].id;
  let r;
  try {
    r = await stkPush({ phone, amountKes: amount, accountRef: o.ref });
  } catch (e) {
    await query("UPDATE order_payments SET status = 'rejected', reject_reason = $2, handled_at = now() WHERE id = $1", [payId, 'M-Pesa prompt could not be sent']);
    console.warn('stk push failed: ' + e.message);
    throw new HttpError(502, 'prompt_failed', 'We could not send the M-Pesa prompt. Try again, or pay to the till.');
  }
  await query(
    'INSERT INTO mpesa_stk_requests (payment_id, checkout_request_id, merchant_request_id, phone_last4, amount_kes, env) VALUES ($1, $2, $3, $4, $5, $6)',
    [payId, r.checkoutRequestId, r.merchantRequestId, phone.slice(-4), amount, mpesaLive() ? 'live' : 'sandbox']
  );
  return { paymentId: String(payId), checkoutRequestId: r.checkoutRequestId, amountKes: amount };
}
