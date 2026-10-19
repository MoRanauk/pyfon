import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';

export const partnerActivityRoutes = Router();

const GROUPS = {
  signoffs: ['job.%'],
  approvals: ['approval.%'],
  invoices: ['invoice.%'],
  products: ['catalog.%', 'video.%'],
  orders: ['order.%', 'quote.%', 'upload.%', 'ticket.%', 'vendor.%'],
  logins: ['auth.%'],
  system: ['user.%', 'settings.%'],
};

const VERB = {
  'auth.login': 'signed in', 'auth.login_failed': 'had a failed sign-in attempt', 'auth.password_changed': 'changed the password',
  'auth.reset_requested': 'asked for a password reset code', 'auth.password_reset': 'reset the password with a code',
  'auth.login_denied_interface': 'was refused sign-in on this desk',
  'job.owner_signed': 'signed off', 'job.cosigned': 'co-signed', 'job.cosign_requested': 'asked for a co-signature on',
  'job.cosign_failed': 'had a failed co-sign on', 'job.rejected': 'rejected', 'job.production_assigned': 'assigned production for',
  'job.file_added': 'added a file to',
  'approval.cancelled': 'cancelled the approval request',
  'invoice.created': 'created', 'invoice.voided': 'voided', 'invoice.emailed': 'emailed', 'invoice.updated': 'updated',
  'order.placed': 'placed', 'quote.requested': 'requested', 'quote.priced': 'set the quote price on',
  'ticket.opened': 'opened', 'ticket.status': 'changed the status of', 'ticket.comment': 'commented on',
  'upload.created': 'uploaded a file for', 'upload.linked': 'linked a file to',
  'settings.whatsapp_mode_changed': 'changed the WhatsApp mode',
};

const schema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  actor: z.string().uuid().optional(),
  type: z.enum(['signoffs', 'approvals', 'invoices', 'products', 'orders', 'logins', 'system']).optional(),
  who: z.enum(['staff', 'all']).default('staff'),
  q: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(2000).default(50),
  offset: z.coerce.number().int().min(0).max(1000000).default(0),
});

function realDate(s) {
  const d = new Date(s + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw new HttpError(400, 'bad_date', 'That date does not exist: ' + s);
}

function describe(r) {
  const d = r.details || {};
  const who = r.actor || 'Someone';
  let ent = [r.entity_type, r.entity_id].filter(Boolean).join(' ');
  if (r.entity_type === 'approval_request') ent = r.approval_summary ? '"' + r.approval_summary + '"' : 'request ' + r.entity_id;
  else if (r.entity_type === 'invoice' && d.number) ent = 'invoice ' + d.number;
  let s;
  if (r.action === 'approval.vote') s = who + (d.vote === 'reject' ? ' rejected ' : ' approved ') + ent + (d.reason ? ' because: ' + d.reason : '');
  else if (r.action === 'approval.created') s = who + ' asked all three partners to approve ' + ent;
  else if (r.action === 'approval.executed') s = 'All three partners approved ' + ent + '. It was applied.';
  else s = who + ' ' + (VERB[r.action] || r.action.replace('.', ' ')) + (ent ? ' ' + ent : '');
  if (r.for_name) s += ' (acting for ' + r.for_name + ')';
  return s;
}

const FROM = ' FROM audit_log a LEFT JOIN users u ON u.id = a.actor_user_id LEFT JOIN users f ON f.id = a.acting_for_user_id LEFT JOIN approval_requests ar ON a.entity_type = \'approval_request\' AND ar.id::text = a.entity_id ';

partnerActivityRoutes.get('/activity', asyncHandler(async (req, res) => {
  const q = parse(schema, req.query);
  if (q.from) realDate(q.from);
  if (q.to) realDate(q.to);
  const w = [];
  const p = [];
  const add = (sql, v) => { p.push(v); w.push(sql.replace('?', () => '$' + p.length)); };
  if (q.who === 'staff') w.push("u.role IN ('partner','developer')");
  if (q.from) add("(a.at AT TIME ZONE 'Africa/Nairobi')::date >= ?::date", q.from);
  if (q.to) add("(a.at AT TIME ZONE 'Africa/Nairobi')::date <= ?::date", q.to);
  if (q.actor) add('a.actor_user_id = ?::uuid', q.actor);
  if (q.type) add('a.action LIKE ANY(?::text[])', GROUPS[q.type]);
  if (q.q) {
    p.push('%' + q.q.replace(/[\\%_]/g, (c) => '\\' + c) + '%');
    const n = p.length;
    w.push(`(a.action ILIKE $${n} OR a.entity_id ILIKE $${n} OR u.full_name ILIKE $${n} OR ar.summary ILIKE $${n})`);
  }
  const where = w.length ? ' WHERE ' + w.join(' AND ') : '';
  const total = (await pool.query('SELECT count(*)::int AS n' + FROM + where, p)).rows[0].n;
  const rows = (await pool.query(
    'SELECT a.id, a.at, a.interface, a.action, a.entity_type, a.entity_id, a.details, u.full_name AS actor, f.full_name AS for_name, ar.summary AS approval_summary'
    + FROM + where + ' ORDER BY a.id DESC LIMIT $' + (p.length + 1) + ' OFFSET $' + (p.length + 2),
    [...p, q.limit, q.offset]
  )).rows;
  const people = (await pool.query("SELECT id, full_name FROM users WHERE role IN ('partner','developer') ORDER BY full_name")).rows;
  res.json({
    total,
    people: people.map((x) => ({ id: String(x.id), name: x.full_name })),
    rows: rows.map((r) => ({ id: String(r.id), at: r.at, desk: r.interface, who: r.actor, actingFor: r.for_name, action: r.action, text: describe(r) })),
  });
}));
