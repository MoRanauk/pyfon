import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { sendEmail } from '../mail.js';

export const partnerInvoiceRoutes = Router();

function shape(r) {
  return {
    id: String(r.id), number: r.number, jobRef: r.job_ref, billName: r.bill_name, billPhone: r.bill_phone,
    billEmail: r.bill_email, lines: r.lines, otherChargesKes: r.other_charges_kes, totalKes: r.total_kes,
    notes: r.notes, discountKes: r.discount_kes || 0, handoverDate: r.handover_day || null, handoverMode: r.handover_mode || null, status: r.status, createdAt: r.created_at, emailedAt: r.emailed_at,
  };
}

async function draftFor(ref) {
  if (!/^JOB-\d{6}$/.test(ref)) throw new HttpError(404, 'job_not_found', 'Job not found');
  const j = (await pool.query('SELECT id, order_id, quote_request_id FROM jobs WHERE ref = $1', [ref])).rows[0];
  if (!j) throw new HttpError(404, 'job_not_found', 'Job not found');
  if (j.order_id) {
    const o = (await pool.query('SELECT * FROM orders WHERE id = $1', [j.order_id])).rows[0];
    const ls = (await pool.query('SELECT sku, name, qty, unit_price_kes, options FROM order_lines WHERE order_id = $1 ORDER BY id', [o.id])).rows;
    const lines = ls.map((l) => ({ sku: l.sku, name: l.name, qty: l.qty, unitPriceKes: l.unit_price_kes, options: l.options }));
    const sum = lines.reduce((a, l) => a + l.unitPriceKes * l.qty, 0);
    const other = o.total_kes - sum;
    if (other < 0) throw new HttpError(409, 'total_mismatch', 'Order total is less than its lines');
    return { jobId: j.id, billName: o.contact_name, billPhone: o.contact_phone, billEmail: o.contact_email, lines, otherChargesKes: other, totalKes: o.total_kes };
  }
  const q = (await pool.query('SELECT * FROM quote_requests WHERE id = $1', [j.quote_request_id])).rows[0];
  if (q.quoted_price_kes === null) throw new HttpError(409, 'no_price', 'Set the quote price first');
  const lines = [{ sku: q.ref, name: 'Quote ' + q.ref + ' (' + q.kind + ')', qty: 1, unitPriceKes: q.quoted_price_kes, options: {} }];
  return { jobId: j.id, billName: q.contact_name, billPhone: q.contact_phone, billEmail: q.contact_email, lines, otherChargesKes: 0, totalKes: q.quoted_price_kes };
}

const SEL = 'SELECT i.*, to_char(i.handover_date, \'YYYY-MM-DD\') AS handover_day, j.ref AS job_ref FROM invoices i JOIN jobs j ON j.id = i.job_id ';

partnerInvoiceRoutes.get('/invoices', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(SEL + 'ORDER BY i.id DESC LIMIT 50');
  res.json({ invoices: rows.map(shape) });
}));

partnerInvoiceRoutes.get('/jobs/:ref/invoice', asyncHandler(async (req, res) => {
  const ref = req.params.ref;
  const live = await pool.query(SEL + "WHERE j.ref = $1 AND i.status = 'issued'", [ref]);
  if (live.rows[0]) return res.json({ invoice: shape(live.rows[0]), draft: null });
  let draft = null;
  let reason = null;
  try { draft = await draftFor(ref); } catch (e) { if (e instanceof HttpError && e.status === 409) reason = e.message; else throw e; }
  res.json({ invoice: null, draft, reason });
}));

partnerInvoiceRoutes.post('/jobs/:ref/invoice', asyncHandler(async (req, res) => {
  const body = parse(z.object({ notes: z.string().trim().max(500).optional() }), req.body || {});
  const d = await draftFor(req.params.ref);
  let row;
  try {
    const ins = await pool.query(
      'INSERT INTO invoices (job_id, bill_name, bill_phone, bill_email, lines, other_charges_kes, total_kes, notes, created_by) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9) RETURNING *',
      [d.jobId, d.billName, d.billPhone, d.billEmail, JSON.stringify(d.lines), d.otherChargesKes, d.totalKes, body.notes || null, req.user.id]
    );
    row = ins.rows[0];
  } catch (e) {
    if (e.code === '23505') throw new HttpError(409, 'invoice_exists', 'This job already has an invoice');
    throw e;
  }
  await audit(req, { action: 'invoice.created', entityType: 'invoice', entityId: String(row.id), actorUserId: req.user.id, details: { number: row.number, total: row.total_kes } });
  res.status(201).json({ invoice: shape({ ...row, job_ref: req.params.ref }) });
}));

partnerInvoiceRoutes.post('/invoices/:id/void', asyncHandler(async (req, res) => {
  if (!/^\d{1,18}$/.test(req.params.id)) throw new HttpError(404, 'invoice_not_found', 'Invoice not found');
  const body = parse(z.object({ reason: z.string().trim().min(3).max(300) }), req.body);
  const u = await pool.query(
    "UPDATE invoices SET status = 'void', voided_at = now(), void_reason = $2 WHERE id = $1 AND status = 'issued' RETURNING id, number",
    [req.params.id, body.reason]
  );
  if (!u.rows[0]) throw new HttpError(404, 'invoice_not_found', 'No live invoice with that id');
  await audit(req, { action: 'invoice.voided', entityType: 'invoice', entityId: req.params.id, actorUserId: req.user.id, details: { number: u.rows[0].number, reason: body.reason } });
  res.json({ ok: true });
}));


const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

partnerInvoiceRoutes.post('/invoices/:id/email', asyncHandler(async (req, res) => {
  if (!/^\d{1,18}$/.test(req.params.id)) throw new HttpError(404, 'invoice_not_found', 'Invoice not found');
  const r = (await pool.query(SEL + "WHERE i.id = $1 AND i.status = 'issued'", [req.params.id])).rows[0];
  if (!r) throw new HttpError(404, 'invoice_not_found', 'No live invoice with that id');
  if (!r.bill_email) throw new HttpError(409, 'no_email', 'This customer has no email address on the order');
  const rows = r.lines.map((l) => '<tr><td style="padding:6px 8px">' + esc(l.name) + ' x ' + l.qty + '</td><td style="padding:6px 8px;text-align:right">KES ' + (l.unitPriceKes * l.qty).toLocaleString('en-KE') + '</td></tr>').join('');
  const other = r.other_charges_kes > 0 ? '<tr><td style="padding:6px 8px">Delivery and other charges</td><td style="padding:6px 8px;text-align:right">KES ' + r.other_charges_kes.toLocaleString('en-KE') + '</td></tr>' : '';
  const html = '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0b2a4a">'
    + '<h2 style="margin-bottom:0">Pyfon Brands</h2><p style="margin-top:4px">Invoice ' + esc(r.number) + ' for job ' + esc(r.job_ref) + '</p>'
    + '<p>Dear ' + esc(r.bill_name) + ',</p><table style="width:100%;border-collapse:collapse;border-top:2px solid #c9a227">' + rows + other
    + (r.discount_kes > 0 ? '<tr><td style="padding:6px 8px">Discount</td><td style="padding:6px 8px;text-align:right">- KES ' + r.discount_kes.toLocaleString('en-KE') + '</td></tr>' : '') + '<tr><td style="padding:8px;border-top:1px solid #ccc"><b>Total</b></td><td style="padding:8px;border-top:1px solid #ccc;text-align:right"><b>KES ' + r.total_kes.toLocaleString('en-KE') + '</b></td></tr></table>'
    + (r.notes ? '<p>' + esc(r.notes) + '</p>' : '')
    + '<p style="font-size:12px;color:#666">Operated by Pyfon Brands<br>Built and owned by Emlabs &middot; &copy; Emlabs. All rights reserved.</p></div>';
  const text = 'Invoice ' + r.number + ' (job ' + r.job_ref + ') total KES ' + r.total_kes + '. Thank you, Pyfon Brands.';
  const ok = await sendEmail({ to: r.bill_email, subject: 'Invoice ' + r.number + ' from Pyfon Brands', text, html });
  if (!ok) throw new HttpError(502, 'email_failed', 'The email could not be sent. Check the Brevo settings.');
  await pool.query('UPDATE invoices SET emailed_at = now() WHERE id = $1', [r.id]);
  await audit(req, { action: 'invoice.emailed', entityType: 'invoice', entityId: String(r.id), actorUserId: req.user.id, details: { number: r.number } });
  res.json({ ok: true });
}));

partnerInvoiceRoutes.patch('/invoices/:id', asyncHandler(async (req, res) => {
  if (!/^\d{1,18}$/.test(req.params.id)) throw new HttpError(404, 'invoice_not_found', 'Invoice not found');
  const b = parse(z.object({
    discountKes: z.number().int().min(0).max(10000000),
    handoverDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    handoverMode: z.enum(['pickup', 'delivery']).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  }).strict(), req.body);
  if (b.handoverDate) {
    const d = new Date(b.handoverDate + 'T00:00:00Z');
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== b.handoverDate) throw new HttpError(400, 'bad_date', 'That date does not exist');
  }
  const cur = (await pool.query("SELECT * FROM invoices WHERE id = $1 AND status = 'issued'", [req.params.id])).rows[0];
  if (!cur) throw new HttpError(404, 'invoice_not_found', 'No live invoice with that id');
  const gross = cur.lines.reduce((a, l) => a + l.unitPriceKes * l.qty, 0) + cur.other_charges_kes;
  if (b.discountKes !== cur.discount_kes) throw new HttpError(409, 'discount_needs_approval', 'A discount change needs approval from all three partners. Use Ask for discount approval.');
  if (b.discountKes > gross) throw new HttpError(400, 'discount_too_big', 'The discount is bigger than the invoice');
  await pool.query(
    'UPDATE invoices SET discount_kes = $2, total_kes = $3, handover_date = $4, handover_mode = $5, notes = $6 WHERE id = $1',
    [cur.id, b.discountKes, gross - b.discountKes, b.handoverDate || null, b.handoverMode || null, b.notes || null]
  );
  await audit(req, { action: 'invoice.updated', entityType: 'invoice', entityId: String(cur.id), actorUserId: req.user.id, details: { number: cur.number, discountKes: b.discountKes, total: gross - b.discountKes } });
  res.json({ ok: true });
}));

partnerInvoiceRoutes.get('/invoices/:id/document', asyncHandler(async (req, res) => {
  if (!/^\d{1,18}$/.test(req.params.id)) throw new HttpError(404, 'invoice_not_found', 'Invoice not found');
  const r = (await pool.query(SEL + 'WHERE i.id = $1', [req.params.id])).rows[0];
  if (!r) throw new HttpError(404, 'invoice_not_found', 'Invoice not found');
  const j = (await pool.query('SELECT order_id FROM jobs WHERE id = $1', [r.job_id])).rows[0];
  let delivery = null;
  if (j && j.order_id) {
    const o = (await pool.query('SELECT delivery_method, delivery_address, delivery_fee_kes FROM orders WHERE id = $1', [j.order_id])).rows[0];
    if (o) delivery = { method: o.delivery_method, address: o.delivery_address, feeKes: o.delivery_fee_kes };
  }
  const served = (await pool.query('SELECT full_name FROM users WHERE id = $1', [r.created_by])).rows[0];
  const disp = (await pool.query("SELECT u.full_name FROM job_signatures s JOIN users u ON u.id = s.partner_id WHERE s.job_id = $1 AND s.step = 'finance_delivery' AND s.role = 'owner' AND s.voided_at IS NULL LIMIT 1", [r.job_id])).rows[0];
  res.json({ invoice: shape(r), delivery, servedBy: served ? served.full_name : null, dispatchedBy: disp ? disp.full_name : null });
}));
