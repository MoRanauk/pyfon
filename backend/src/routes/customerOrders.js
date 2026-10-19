import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { withTransaction } from '../db/tx.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import { createJob } from '../jobs/createJob.js';
import { orderWhatsappUrl, quoteWhatsappUrl } from '../whatsapp.js';
import { findDelivery } from '../delivery.js';
import { enqueueMessage } from '../messages/queue.js';
import { shapeFile } from './customerFiles.js';
import { buildStages } from '../jobs/tracking.js';

export const customerOrderRoutes = Router();

const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

const phone = z.string().trim().regex(/^\+?[0-9 ]{9,15}$/, 'Enter a valid phone number');
const shortText = (max) => z.string().trim().max(max);

const orderSchema = z.object({
  contactName: z.string().trim().min(2).max(100),
  contactPhone: phone,
  contactEmail: z.string().trim().email().max(150),
  deliveryNotes: shortText(500).optional(),
  deliveryMethod: z.string().trim().min(1).max(30).default('pickup'),
  deliveryAddress: shortText(300).optional(),
  lines: z.array(z.object({
    sku: z.string().trim().min(1).max(40),
    qty: z.number().int().min(1).max(100000),
    options: z.record(z.string().max(40), z.string().max(80)).default({}),
    personalization: z.object({ text: shortText(200).optional() }).default({}),
    designId: z.string().regex(/^\d{1,18}$/).optional(),
  })).min(1).max(30),
});

const quoteSchema = z.object({
  kind: z.enum(['service', 'bulk', 'corporate', 'design']),
  sku: z.string().trim().min(1).max(40).optional(),
  quantity: z.number().int().min(1).max(1000000).optional(),
  companyName: shortText(150).optional(),
  contactName: z.string().trim().min(2).max(100),
  contactPhone: phone,
  contactEmail: z.string().trim().email().max(150),
  notes: shortText(2000).optional(),
  spec: z.object({
    size: shortText(100).optional(),
    material: shortText(100).optional(),
    finish: shortText(100).optional(),
    turnaround: shortText(100).optional(),
  }).default({}),
});

const FRIENDLY = {
  finance_quote: 'Confirming price and payment',
  creative: 'Preparing your design',
  production: 'In production',
  finance_delivery: 'Ready for dispatch',
  done: 'Delivered',
};

function friendly(row) {
  if (row.job_status === 'cancelled') return 'Cancelled';
  return FRIENDLY[row.current_step] || 'Received';
}

const kes = (n) => 'KES ' + Number(n).toLocaleString('en-KE');
const siteUrl = () => (process.env.SITE_URL || String(process.env.CORS_ORIGINS || '').split(',')[0] || '').trim().replace(/\/+$/, '');

function orderText({ name, ref, itemsKes, totalKes, delivery, email }) {
  const first = String(name).trim().split(/\s+/)[0];
  let del = 'Delivery: we will confirm the cost with you.';
  if (delivery.feeKes === 0) del = 'Delivery: ' + delivery.label + ' (no charge).';
  else if (delivery.feeKes > 0) del = 'Delivery: ' + delivery.label + ', ' + kes(delivery.feeKes) + '.';
  return 'Hello ' + first + ', thank you for ordering with Pyfon Brands. Your order ' + ref + ' is received. Items: ' + kes(itemsKes) + '. ' + del
    + (delivery.feeKes == null ? '' : ' Total: ' + kes(totalKes) + '.')
    + ' Track your order progress here: ' + siteUrl() + '/orders.'
    + (email ? ' We will also email you when it is delivered.' : '')
    + ' Thank you for choosing Pyfon Brands.';
}

async function findItems(skus, storefront) {
  const { rows } = await query(
    `SELECT ci.id, ci.sku, ci.name, ci.type, ci.price_type, ci.price_kes, ci.min_order_qty, ci.stock_status
       FROM catalog_items ci
       JOIN item_storefronts s ON s.item_id = ci.id
      WHERE ci.sku = ANY($1) AND ci.status = 'active' AND s.storefront_code = $2`,
    [skus, storefront]
  );
  return new Map(rows.map((r) => [r.sku, r]));
}

customerOrderRoutes.post('/orders', writeLimiter, asyncHandler(async (req, res) => {
  const body = parse(orderSchema, req.body);
  const storefront = req.interfaceCode;
  const items = await findItems([...new Set(body.lines.map((l) => l.sku))], storefront);

  const problems = [];
  const delivery = findDelivery(body.deliveryMethod);
  if (!delivery) problems.push({ field: 'deliveryMethod', message: 'Choose a delivery option' });
  else if (delivery.needsAddress && (body.deliveryAddress || '').length < 5) {
    problems.push({ field: 'deliveryAddress', message: 'Enter your delivery address' });
  }

  const designIds = [...new Set(body.lines.map((l) => l.designId).filter(Boolean))];
  const designs = new Map();
  if (designIds.length) {
    const dq = await query("SELECT id, item_id, name, url FROM item_designs WHERE id = ANY($1::bigint[]) AND status = 'active'", [designIds]);
    for (const r of dq.rows) designs.set(String(r.id), r);
  }
  const lines = [];
  body.lines.forEach((l, i) => {
    const item = items.get(l.sku);
    if (!item) return problems.push({ field: 'lines.' + i + '.sku', message: 'Item not available' });
    if (item.type !== 'product' || item.price_type !== 'fixed' || item.price_kes == null) {
      return problems.push({ field: 'lines.' + i + '.sku', message: 'This item needs a quote request, not an order' });
    }
    if (item.stock_status === 'out_of_stock') return problems.push({ field: 'lines.' + i + '.sku', message: 'Out of stock' });
    if (l.qty < (item.min_order_qty || 1)) {
      return problems.push({ field: 'lines.' + i + '.qty', message: 'Minimum order quantity is ' + item.min_order_qty });
    }
    let dz = null;
    if (l.designId) {
      dz = designs.get(l.designId);
      if (!dz || String(dz.item_id) !== String(item.id)) return problems.push({ field: 'lines.' + i + '.designId', message: 'That design is not available for this item' });
    }
    lines.push({ itemId: item.id, sku: item.sku, name: item.name, unitPriceKes: item.price_kes, qty: l.qty, options: l.options, personalization: l.personalization, designId: dz ? dz.id : null, designName: dz ? dz.name : null, designUrl: dz ? dz.url : null });
  });
  if (problems.length) throw new HttpError(400, 'order_invalid', 'Some items cannot be ordered', problems);

  const itemsKes = lines.reduce((sum, l) => sum + l.unitPriceKes * l.qty, 0);
  const feeKes = delivery.feeKes;
  const totalKes = itemsKes + (feeKes || 0);

  const result = await withTransaction(async (client) => {
    const o = await client.query(
      `INSERT INTO orders (customer_id, storefront_code, contact_name, contact_phone, contact_email, delivery_notes, total_kes, delivery_method, delivery_fee_kes, delivery_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, ref`,
      [req.user.id, storefront, body.contactName, body.contactPhone, body.contactEmail ?? null, body.deliveryNotes ?? null, totalKes, delivery.code, feeKes, body.deliveryAddress ?? null]
    );
    const order = o.rows[0];
    for (const l of lines) {
      await client.query(
        `INSERT INTO order_lines (order_id, item_id, sku, name, unit_price_kes, qty, options, personalization, design_id, design_name, design_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [order.id, l.itemId, l.sku, l.name, l.unitPriceKes, l.qty, JSON.stringify(l.options), JSON.stringify(l.personalization), l.designId, l.designName, l.designUrl]
      );
    }
    const job = await createJob(client, { orderId: order.id });
    await enqueueMessage(client, {
      kind: 'order_received',
      phone: body.contactPhone,
      orderId: order.id,
      body: orderText({ name: body.contactName, ref: order.ref, itemsKes, totalKes, delivery, email: body.contactEmail }),
    });
    return { order, job };
  });

  await audit(req, { action: 'order.placed', entityType: 'order', entityId: String(result.order.id), actorUserId: req.user.id, details: { ref: result.order.ref, job: result.job.ref, totalKes, delivery: delivery.code } });

  const deliveryLine = [delivery.label + (feeKes == null ? ' (cost to be confirmed)' : feeKes ? ' ' + kes(feeKes) : ''), body.deliveryAddress, body.deliveryNotes].filter(Boolean).join(' | ');
  res.status(201).json({
    order: {
      ref: result.order.ref,
      totalKes,
      itemsKes,
      deliveryFeeKes: feeKes,
      deliveryLabel: delivery.label,
      lines: lines.map((l) => ({ sku: l.sku, name: l.name, qty: l.qty, unitPriceKes: l.unitPriceKes, options: l.options })),
    },
    job: { ref: result.job.ref },
    whatsappUrl: orderWhatsappUrl({ ref: result.order.ref, storefront, contactName: body.contactName, totalKes, lines, deliveryNotes: deliveryLine }),
  });
}));

customerOrderRoutes.post('/quote-requests', writeLimiter, asyncHandler(async (req, res) => {
  const body = parse(quoteSchema, req.body);
  const storefront = req.interfaceCode;
  const problems = [];
  if (body.kind === 'corporate' && !body.companyName) problems.push({ field: 'companyName', message: 'Company name is required' });
  if (body.kind === 'bulk' && !body.quantity) problems.push({ field: 'quantity', message: 'Quantity is required' });
  if (body.kind === 'service' && !body.sku) problems.push({ field: 'sku', message: 'Choose a service' });

  let item = null;
  if (body.sku) {
    item = (await findItems([body.sku], storefront)).get(body.sku) || null;
    if (!item) problems.push({ field: 'sku', message: 'Item not available' });
  }
  if (problems.length) throw new HttpError(400, 'quote_invalid', 'Some fields are invalid', problems);

  const result = await withTransaction(async (client) => {
    const q = await client.query(
      `INSERT INTO quote_requests (customer_id, storefront_code, kind, item_id, spec, quantity, company_name, contact_name, contact_phone, contact_email, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, ref`,
      [req.user.id, storefront, body.kind, item ? item.id : null, JSON.stringify(body.spec), body.quantity ?? null, body.companyName ?? null, body.contactName, body.contactPhone, body.contactEmail ?? null, body.notes ?? null]
    );
    const quote = q.rows[0];
    const job = await createJob(client, { quoteRequestId: quote.id });
    await enqueueMessage(client, {
      kind: 'quote_received',
      phone: body.contactPhone,
      quoteRequestId: quote.id,
      body: 'Hello ' + String(body.contactName).trim().split(/\s+/)[0] + ', Pyfon Brands has received your quote request ' + quote.ref + '. We will reply here on WhatsApp with a price.',
    });
    return { quote, job };
  });

  await audit(req, { action: 'quote.requested', entityType: 'quote_request', entityId: String(result.quote.id), actorUserId: req.user.id, details: { ref: result.quote.ref, job: result.job.ref, kind: body.kind } });

  const summary = [item ? item.name + ' (' + item.sku + ')' : null, body.quantity ? 'Quantity: ' + body.quantity : null, body.companyName ? 'Company: ' + body.companyName : null].filter(Boolean).join(', ');
  res.status(201).json({
    quoteRequest: { ref: result.quote.ref, kind: body.kind },
    job: { ref: result.job.ref },
    whatsappUrl: quoteWhatsappUrl({ ref: result.quote.ref, storefront, contactName: body.contactName, kind: body.kind, summary }),
  });
}));

customerOrderRoutes.get('/orders', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT o.id, o.ref, o.total_kes, o.created_at, o.delivery_method, o.delivery_fee_kes, o.delivery_address, o.delivery_notes, j.ref AS job_ref, j.current_step, j.status AS job_status, j.completed_at
       FROM orders o LEFT JOIN jobs j ON j.order_id = o.id
      WHERE o.customer_id = $1 ORDER BY o.created_at DESC LIMIT 50`,
    [req.user.id]
  );
  const orderIds = rows.map((r) => r.id);

  const stepsByOrder = new Map();
  const readyByOrder = new Map();
  if (orderIds.length) {
    const st = await query(
      `SELECT j.order_id, s.step, s.status, s.signed_off_at
         FROM jobs j JOIN job_steps s ON s.job_id = j.id WHERE j.order_id = ANY($1)`,
      [orderIds]
    );
    for (const s of st.rows) {
      const k = String(s.order_id);
      if (!stepsByOrder.has(k)) stepsByOrder.set(k, {});
      stepsByOrder.get(k)[s.step] = { status: s.status, signedOffAt: s.signed_off_at };
    }
    const rd = await query(
      `SELECT j.order_id, min(g.signed_at) AS at
         FROM job_signatures g JOIN jobs j ON j.id = g.job_id
        WHERE j.order_id = ANY($1) AND g.step = 'finance_delivery' AND g.role = 'owner' AND g.voided_at IS NULL
        GROUP BY j.order_id`,
      [orderIds]
    );
    for (const x of rd.rows) readyByOrder.set(String(x.order_id), x.at);
  }
  const trackingFor = (r) => {
    if (!r.job_ref || r.job_status === 'cancelled') return null;
    return buildStages({
      createdAt: r.created_at,
      deliveryMethod: r.delivery_method,
      jobStatus: r.job_status,
      steps: stepsByOrder.get(String(r.id)) || {},
      readyAt: readyByOrder.get(String(r.id)) || null,
      completedAt: r.completed_at || null,
    });
  };

  const linesByOrder = new Map();
  if (orderIds.length) {
    const lines = await query(
      `SELECT id, order_id, sku, name, qty, unit_price_kes, options, personalization, design_name, design_url FROM order_lines WHERE order_id = ANY($1) ORDER BY id`,
      [orderIds]
    );
    const lineIds = lines.rows.map((l) => l.id);
    const filesByLine = new Map();
    if (lineIds.length) {
      const files = await query(
        `SELECT id, order_line_id, purpose, url, original_name, mime_type, bytes
           FROM attachments WHERE order_line_id = ANY($1) ORDER BY id`,
        [lineIds]
      );
      for (const f of files.rows) {
        const k = String(f.order_line_id);
        if (!filesByLine.has(k)) filesByLine.set(k, []);
        filesByLine.get(k).push(shapeFile(f));
      }
    }
    for (const l of lines.rows) {
      const k = String(l.order_id);
      if (!linesByOrder.has(k)) linesByOrder.set(k, []);
      linesByOrder.get(k).push({ lineId: l.id, sku: l.sku, name: l.name, qty: l.qty, unitPriceKes: l.unit_price_kes, options: l.options || {}, personalization: l.personalization || {}, designName: l.design_name || null, designUrl: l.design_url || null, files: filesByLine.get(String(l.id)) || [] });
    }
  }

  res.json({
    orders: rows.map((r) => ({
      ref: r.ref,
      totalKes: r.total_kes,
      createdAt: r.created_at,
      progress: friendly(r),
      delivery: { method: r.delivery_method, label: (findDelivery(r.delivery_method) || {}).label || r.delivery_method, feeKes: r.delivery_fee_kes, address: r.delivery_address, notes: r.delivery_notes }, tracking: trackingFor(r),
      lines: linesByOrder.get(String(r.id)) || [],
    })),
  });
}));

customerOrderRoutes.get('/quote-requests', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT q.id, q.ref, q.kind, q.status, q.quoted_price_kes, q.created_at, q.quantity, q.company_name, q.spec, q.notes, ci.name AS item_name, j.current_step, j.status AS job_status
       FROM quote_requests q LEFT JOIN jobs j ON j.quote_request_id = q.id LEFT JOIN catalog_items ci ON ci.id = q.item_id
      WHERE q.customer_id = $1 ORDER BY q.created_at DESC LIMIT 50`,
    [req.user.id]
  );
  const quoteIds = rows.map((r) => r.id);

  const filesByQuote = new Map();
  if (quoteIds.length) {
    const files = await query(
      `SELECT id, quote_request_id, purpose, url, original_name, mime_type, bytes
         FROM attachments WHERE quote_request_id = ANY($1) ORDER BY id`,
      [quoteIds]
    );
    for (const f of files.rows) {
      const k = String(f.quote_request_id);
      if (!filesByQuote.has(k)) filesByQuote.set(k, []);
      filesByQuote.get(k).push(shapeFile(f));
    }
  }

  res.json({
    quoteRequests: rows.map((r) => ({
      ref: r.ref,
      kind: r.kind,
      status: r.status,
      quotedPriceKes: r.quoted_price_kes, item: r.item_name || null, quantity: r.quantity, companyName: r.company_name, spec: r.spec || {}, notes: r.notes || null,
      createdAt: r.created_at,
      progress: friendly(r),
      files: filesByQuote.get(String(r.id)) || [],
    })),
  });
}));
