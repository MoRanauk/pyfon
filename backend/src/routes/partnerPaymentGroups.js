import { SHOP_NAMES } from '../delivery.js';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { withTransaction } from '../db/tx.js';
import { HttpError, asyncHandler } from '../errors.js';
import { audit } from '../audit.js';
import { parse } from '../validate.js';
import { enqueueMessage } from '../messages/queue.js';
import { sendEmail } from '../mail.js';

// One M-Pesa payment for many orders: confirmed or rejected as a whole group.
const CODE = /^[A-Z0-9]{4,20}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const kes = (n) => 'KES ' + Number(n).toLocaleString('en-KE');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const code = z.string().trim().max(20).transform((s) => s.toUpperCase()).refine((s) => CODE.test(s), 'Type the M-Pesa code (4 to 20 letters and numbers)');

async function tellGroup(items) {
  const o = items[0].o;
  const shop = SHOP_NAMES[o.storefront_code] || 'Pyfon Brands';
  const first = String(o.contact_name).trim().split(/\s+/)[0];
  const total = items.reduce((a, x) => a + x.amountKes, 0);
  const list = items.map((x) => x.o.ref + ' (' + kes(x.amountKes) + ')').join(', ');
  const owing = items.some((x) => x.r.dueKes > 0);
  const body = 'Hello ' + first + ', your payment of ' + kes(total) + ' for ' + list + ' has been received. '
    + (owing ? 'Some orders still have a balance. ' : 'These orders are fully paid. ')
    + 'Thank you for choosing ' + shop + '.';
  let queued = false;
  let emailed = false;
  try { await enqueueMessage({ query }, { kind: 'payment_received', phone: o.contact_phone, orderId: o.id, body }); queued = true; } catch (e) { console.warn('payment message not queued: ' + e.message); }
  if (o.contact_email) {
    try {
      const html = '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0b2a4a"><h2>' + esc(shop) + '</h2><p>' + esc(body) + '</p>'
        + '<p style="font-size:12px;color:#666">Operated by Pyfon Brands<br>Built and owned by Emlabs &middot; &copy; Emlabs. All rights reserved.</p></div>';
      emailed = Boolean(await sendEmail({ to: o.contact_email, subject: 'Payment received for ' + items.length + ' orders', text: body, html, fromName: shop }));
    } catch (e) { console.warn('payment email not sent: ' + e.message); }
  }
  return { queued, emailed };
}

export function addGroupRoutes(router, { settle, lockOrder, limiter }) {
  router.post('/payments/batch/:batchId/confirm', limiter, asyncHandler(async (req, res) => {
    const batchId = String(req.params.batchId);
    if (!UUID.test(batchId)) throw new HttpError(404, 'group_not_found', 'Payment group not found');
    const b = parse(z.object({ mpesaCode: code }), req.body);
    const items = await withTransaction(async (client) => {
      const peek = await client.query('SELECT DISTINCT order_id FROM order_payments WHERE batch_id = $1 ORDER BY order_id', [batchId]);
      if (!peek.rows.length) throw new HttpError(404, 'group_not_found', 'Payment group not found');
      const orders = {};
      for (const row of peek.rows) orders[row.order_id] = await lockOrder(client, row.order_id);
      const ps = await client.query('SELECT id, order_id, status, claimed_amount_kes FROM order_payments WHERE batch_id = $1 ORDER BY order_id, id FOR UPDATE', [batchId]);
      if (ps.rows.some((p) => p.status !== 'awaiting')) throw new HttpError(409, 'not_awaiting', 'This group was already handled');
      const out = [];
      for (const p of ps.rows) {
        const o = orders[p.order_id];
        const amountKes = p.claimed_amount_kes;
        const r = await settle(client, o, p.id, b.mpesaCode, amountKes, req.user.id);
        out.push({ o, r, amountKes });
      }
      return out;
    });
    for (const x of items) {
      await audit(req, { action: 'payment.confirmed', entityType: 'order', entityId: String(x.o.id), actorUserId: req.user.id, details: { orderRef: x.o.ref, jobRef: x.r.jobRef, amountKes: x.amountKes, code: b.mpesaCode, batchId } });
    }
    const sent = await tellGroup(items);
    res.json({
      ok: true,
      orders: items.map((x) => ({ orderRef: x.o.ref, amountKes: x.amountKes, dueKes: x.r.dueKes })),
      totalKes: items.reduce((a, x) => a + x.amountKes, 0),
      messageQueued: sent.queued,
      emailed: sent.emailed,
    });
  }));

  router.post('/payments/batch/:batchId/reject', limiter, asyncHandler(async (req, res) => {
    const batchId = String(req.params.batchId);
    if (!UUID.test(batchId)) throw new HttpError(404, 'group_not_found', 'Payment group not found');
    const b = parse(z.object({ reason: z.string().trim().min(3).max(300) }), req.body);
    const u = await query("UPDATE order_payments SET status = 'rejected', reject_reason = $2, handled_by = $3, handled_at = now() WHERE batch_id = $1 AND status = 'awaiting' RETURNING order_id", [batchId, b.reason, req.user.id]);
    if (!u.rows.length) throw new HttpError(409, 'not_awaiting', 'This group was already handled or does not exist');
    await audit(req, { action: 'payment.rejected', entityType: 'order', entityId: String(u.rows[0].order_id), actorUserId: req.user.id, details: { batchId, orderIds: u.rows.map((r) => String(r.order_id)), reason: b.reason } });
    res.json({ ok: true, rejected: u.rows.length });
  }));
}
