import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, asyncHandler } from '../errors.js';
import { parse } from '../validate.js';
import { audit } from '../audit.js';
import '../approvals/moneyActions.js';

export const partnerMoneyRoutes = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: 'too_many_attempts', message: 'Too many attempts. Try again later.' } }),
});
const CATS = {
  income: ['Sales', 'Design fees', 'Other income'],
  expense: ['Materials', 'Dealer payment', 'Printing supplies', 'Delivery', 'Rent', 'Utilities', 'Salaries', 'Marketing', 'Airtime and internet', 'Equipment', 'Other'],
};
function validDay(s) { try { return new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s; } catch (e) { return false; } }
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(validDay, 'Use a real date');
const rangeQ = z.object({ from: day.optional(), to: day.optional() });
function bounds(q) {
  const r = parse(rangeQ, q);
  const now = new Date();
  return [r.from || now.toISOString().slice(0, 8) + '01', r.to || now.toISOString().slice(0, 10)];
}
const COLS = `m.id, to_char(m.entry_date, 'YYYY-MM-DD') AS entry_date, m.kind, m.category, m.cost_type, m.amount_kes, m.job_ref, m.party, m.note, m.reverses_id, m.deleted_at, m.deleted_reason, (SELECT full_name FROM users u WHERE u.id = m.created_by) AS by_name`;
const shape = (r) => ({
  id: String(r.id), date: r.entry_date, kind: r.kind, category: r.category, costType: r.cost_type,
  amountKes: r.amount_kes, jobRef: r.job_ref, party: r.party, note: r.note,
  reversesId: r.reverses_id ? String(r.reverses_id) : null, by: r.by_name, deleted: Boolean(r.deleted_at), deletedReason: r.deleted_reason,
});

partnerMoneyRoutes.get('/money/summary', asyncHandler(async (req, res) => {
  const [from, to] = bounds(req.query);
  const { rows } = await query(
    `SELECT kind, cost_type, category, COALESCE(sum(amount_kes), 0)::int AS total FROM money_entries
      WHERE deleted_at IS NULL AND entry_date BETWEEN $1 AND $2 GROUP BY kind, cost_type, category ORDER BY category`, [from, to]);
  let income = 0; let direct = 0; let overhead = 0;
  for (const r of rows) {
    if (r.kind === 'income') income += r.total;
    else if (r.cost_type === 'direct') direct += r.total;
    else overhead += r.total;
  }
  res.json({ from, to, income, direct, gross: income - direct, overhead, net: income - direct - overhead, byCategory: rows });
}));

partnerMoneyRoutes.get('/money/by-job', asyncHandler(async (req, res) => {
  const [from, to] = bounds(req.query);
  const { rows } = await query(
    `SELECT job_ref, COALESCE(sum(amount_kes) FILTER (WHERE kind = 'income'), 0)::int AS income,
            COALESCE(sum(amount_kes) FILTER (WHERE kind = 'expense'), 0)::int AS cost
       FROM money_entries WHERE deleted_at IS NULL AND job_ref IS NOT NULL AND entry_date BETWEEN $1 AND $2
      GROUP BY job_ref ORDER BY job_ref DESC LIMIT 200`, [from, to]);
  res.json({ jobs: rows.map((r) => ({ jobRef: r.job_ref, income: r.income, cost: r.cost, profit: r.income - r.cost })) });
}));

const listQ = z.object({ kind: z.enum(['income', 'expense']).optional(), job: z.string().trim().max(40).optional(), deleted: z.literal('1').optional() });
partnerMoneyRoutes.get('/money/entries', asyncHandler(async (req, res) => {
  const [from, to] = bounds(req.query);
  const f = parse(listQ, req.query);
  const p = [from, to];
  let w = 'm.entry_date BETWEEN $1 AND $2';
  if (f.kind) { p.push(f.kind); w += ' AND m.kind = $' + p.length; }
  if (f.job) { p.push(f.job); w += ' AND m.job_ref = $' + p.length; }
  if (!f.deleted) w += ' AND m.deleted_at IS NULL';
  const { rows } = await query('SELECT ' + COLS + ' FROM money_entries m WHERE ' + w + ' ORDER BY m.entry_date DESC, m.id DESC LIMIT 500', p);
  res.json({ from, to, entries: rows.map(shape) });
}));

const addSchema = z.object({
  date: day,
  kind: z.enum(['income', 'expense']),
  category: z.string().trim().min(2).max(40),
  costType: z.enum(['direct', 'overhead']).optional(),
  amountKes: z.number().int().min(1).max(100000000),
  jobRef: z.string().trim().max(40).optional(),
  party: z.string().trim().max(80).optional(),
  note: z.string().trim().max(300).optional(),
});
partnerMoneyRoutes.post('/money/entries', limiter, asyncHandler(async (req, res) => {
  const b = parse(addSchema, req.body);
  if (!CATS[b.kind].includes(b.category)) throw new HttpError(400, 'bad_category', 'Choose a category from the list');
  let costType = null;
  if (b.kind === 'expense') {
    costType = b.jobRef ? 'direct' : b.costType;
    if (!costType) throw new HttpError(400, 'cost_type_required', 'Say whether this cost is direct or an overhead');
  }
  if (b.jobRef) {
    const j = await query('SELECT 1 FROM jobs WHERE ref = $1', [b.jobRef]);
    if (!j.rows.length) throw new HttpError(404, 'job_not_found', 'No job has that reference');
  }
  const ins = await query(
    'INSERT INTO money_entries (entry_date, kind, category, cost_type, amount_kes, job_ref, party, note, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
    [b.date, b.kind, b.category, costType, b.amountKes, b.jobRef || null, b.party || null, b.note || null, req.user.id]
  );
  const id = String(ins.rows[0].id);
  await audit(req, { action: 'money.added', entityType: 'money_entry', entityId: id, actorUserId: req.user.id, details: { kind: b.kind, category: b.category, amountKes: b.amountKes, jobRef: b.jobRef || null } });
  res.status(201).json({ id });
}));

partnerMoneyRoutes.post('/money/entries/:id/reverse', limiter, asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!/^\d{1,18}$/.test(id)) throw new HttpError(404, 'entry_not_found', 'Money entry not found');
  const b = parse(z.object({ reason: z.string().trim().min(3).max(300) }), req.body);
  const f = await query('SELECT id, deleted_at, reverses_id FROM money_entries WHERE id = $1', [id]);
  const e = f.rows[0];
  if (!e) throw new HttpError(404, 'entry_not_found', 'Money entry not found');
  if (e.deleted_at) throw new HttpError(409, 'already_deleted', 'This entry is deleted');
  if (e.reverses_id) throw new HttpError(409, 'is_reversal', 'A reversal cannot be reversed');
  let ins;
  try {
    ins = await query(
      `INSERT INTO money_entries (entry_date, kind, category, cost_type, amount_kes, job_ref, party, note, reverses_id, created_by)
       SELECT entry_date, kind, category, cost_type, -amount_kes, job_ref, party, $2, id, $3 FROM money_entries WHERE id = $1 RETURNING id`,
      [id, 'Reversal of #' + id + ': ' + b.reason, req.user.id]
    );
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'already_reversed', 'This entry was already reversed');
    throw err;
  }
  await audit(req, { action: 'money.reversed', entityType: 'money_entry', entityId: id, actorUserId: req.user.id, details: { reason: b.reason, reversalId: String(ins.rows[0].id) } });
  res.status(201).json({ id: String(ins.rows[0].id) });
}));
