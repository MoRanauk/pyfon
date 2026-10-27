import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { withTransaction } from '../db/tx.js';
import { query } from '../db/pool.js';
import { asyncHandler } from '../errors.js';
import { audit } from '../audit.js';
import { settle, lockOrder, tell } from './partnerPayments.js';
import { verifyPaid } from '../mpesa/query.js';

// PUBLIC. Safaricom calls this. The secret in the path is the guard.
// It records the receipt, then (if switched on) confirms the payment after Safaricom itself says it succeeded.
export const mpesaCallbackRoutes = Router();

const RECEIPT = /^[A-Z0-9]{10}$/;
function same(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

async function note(req, action, paymentId, details) {
  const base = { action, entityType: 'payment', entityId: String(paymentId) };
  try { await audit(req, { ...base, actorUserId: null, details: { ...details, auto: true } }); return; } catch (e) { /* try next */ }
  try { await audit(req, { ...base, actorUserId: process.env.MPESA_AUTO_USER_ID, details: { ...details, auto: true, system: true } }); } catch (e) { console.warn('audit skipped: ' + e.message); }
}

async function autoConfirm(req, d) {
  if (process.env.MPESA_AUTO_CONFIRM !== '1') return;
  const userId = process.env.MPESA_AUTO_USER_ID;
  if (!userId) { console.warn('auto confirm skipped: MPESA_AUTO_USER_ID is not set'); return; }
  const cap = Number(process.env.MPESA_AUTO_MAX_KES || 100000);
  if (d.amountKes > cap) { await note(req, 'payment.auto_skipped', d.paymentId, { reason: 'Above the automatic limit' }); return; }
  if (!(await verifyPaid(d.checkoutId))) { await note(req, 'payment.auto_skipped', d.paymentId, { reason: 'Safaricom did not confirm the prompt' }); return; }
  const first = await query('SELECT order_id FROM order_payments WHERE id = $1', [d.paymentId]);
  if (!first.rows[0]) return;
  let res = null;
  try {
    res = await withTransaction(async (client) => {
      const o = await lockOrder(client, first.rows[0].order_id);
      const p = await client.query('SELECT id, status FROM order_payments WHERE id = $1 FOR UPDATE', [d.paymentId]);
      if (!p.rows[0] || p.rows[0].status !== 'awaiting') return null;
      const r = await settle(client, o, d.paymentId, d.receipt, d.amountKes, userId);
      return { o, r };
    });
  } catch (e) {
    await note(req, 'payment.auto_failed', d.paymentId, { reason: String(e.message).slice(0, 160) });
    return;
  }
  if (!res) return;
  await note(req, 'payment.auto_confirmed', d.paymentId, { orderRef: res.o.ref, amountKes: d.amountKes, code: d.receipt });
  await tell(res.o, d.amountKes, res.r);
}

mpesaCallbackRoutes.post('/callback/:secret', asyncHandler(async (req, res) => {
  const want = process.env.MPESA_CALLBACK_SECRET;
  if (!want || !same(req.params.secret, want)) return res.status(404).json({ error: { code: 'not_found', message: 'Not found' } });
  const ack = () => res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  const cb = req.body && req.body.Body && req.body.Body.stkCallback;
  if (!cb || typeof cb.CheckoutRequestID !== 'string') return ack();
  const code = Number(cb.ResultCode);
  const items = cb.CallbackMetadata && Array.isArray(cb.CallbackMetadata.Item) ? cb.CallbackMetadata.Item : [];
  const pick = (n) => { const it = items.find((i) => i && i.Name === n); return it ? it.Value : undefined; };
  const receipt = String(pick('MpesaReceiptNumber') || '').toUpperCase();
  const got = Math.round(Number(pick('Amount')));
  const desc = String(cb.ResultDesc || '').slice(0, 200);

  const out = await withTransaction(async (client) => {
    const r = await client.query('SELECT id, payment_id, amount_kes, result_code FROM mpesa_stk_requests WHERE checkout_request_id = $1 FOR UPDATE', [cb.CheckoutRequestID]);
    const row = r.rows[0];
    if (!row || row.result_code !== null) return null;
    if (code === 0) {
      if (!RECEIPT.test(receipt) || got !== row.amount_kes) {
        await client.query('UPDATE mpesa_stk_requests SET result_code = $2, result_desc = $3, completed_at = now() WHERE id = $1', [row.id, code, 'Check by hand: receipt or amount did not match (' + got + ')']);
        return { paymentId: row.payment_id, state: 'check' };
      }
      await client.query('UPDATE mpesa_stk_requests SET result_code = $2, result_desc = $3, receipt = $4, completed_at = now() WHERE id = $1', [row.id, code, desc, receipt]);
      await client.query("UPDATE order_payments SET claimed_code = $2, claimed_amount_kes = $3 WHERE id = $1 AND status = 'awaiting'", [row.payment_id, receipt, got]);
      return { paymentId: row.payment_id, state: 'received', receipt, amountKes: got };
    }
    await client.query('UPDATE mpesa_stk_requests SET result_code = $2, result_desc = $3, completed_at = now() WHERE id = $1', [row.id, code, desc]);
    await client.query("UPDATE order_payments SET status = 'rejected', reject_reason = $2, handled_at = now() WHERE id = $1 AND status = 'awaiting'", [row.payment_id, 'Prompt not completed: ' + desc]);
    return { paymentId: row.payment_id, state: 'failed' };
  });
  ack();
  if (!out) return;
  await note(req, 'payment.prompt_result', out.paymentId, { state: out.state });
  if (out.state === 'received') {
    autoConfirm(req, { paymentId: out.paymentId, checkoutId: cb.CheckoutRequestID, receipt: out.receipt, amountKes: out.amountKes })
      .catch((e) => console.warn('auto confirm error: ' + e.message));
  }
}));
