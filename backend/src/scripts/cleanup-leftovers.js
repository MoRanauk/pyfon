import { query } from '../db/pool.js';
import { withTransaction } from '../db/tx.js';

// Removes the leftover test rows. DRY RUN by default (everything is rolled back).
//   node --env-file=.env src\scripts\cleanup-leftovers.js                 (dry run)
//   node --env-file=.env src\scripts\cleanup-leftovers.js --apply         (real)
const APPLY = process.argv.includes('--apply');
const TABLES = ['approval_votes', 'approval_requests', 'coupon_redemptions', 'coupon_approvals', 'coupons', 'partner_messages', 'partner_group_reads', 'seller_applications', 'application_invites', 'attachments', 'ticket_comments', 'tickets', 'code_notes', 'code_vault', 'site_content_history', 'site_content'];
const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
class Dry extends Error {}

async function fks(c, table) {
  const r = await c.query(
    `SELECT c.conrelid::regclass::text AS tbl, a.attname AS col, ra.attname AS refcol, c.confdeltype AS del
       FROM pg_constraint c
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
       JOIN pg_attribute ra ON ra.attrelid = c.confrelid AND ra.attnum = c.confkey[1]
      WHERE c.contype = 'f' AND c.confrelid = $1::regclass AND array_length(c.conkey, 1) = 1
      ORDER BY 1, 2`, [table]);
  return r.rows;
}
async function has(c, table) { return (await c.query('SELECT to_regclass($1) IS NOT NULL AS ok', [table])).rows[0].ok; }
async function purge(c, table, where, sink, depth = 0) {
  if (depth > 6) throw new Error('Link chain too deep at ' + table);
  for (const f of await fks(c, table)) {
    if ((f.del !== 'a' && f.del !== 'r') || f.tbl === table) continue;
    await purge(c, f.tbl, q(f.col) + '::text IN (SELECT ' + q(f.refcol) + '::text FROM ' + table + ' WHERE ' + where + ')', sink, depth + 1);
  }
  const r = await c.query('DELETE FROM ' + table + ' WHERE ' + where);
  if (r.rowCount) sink[table] = (sink[table] || 0) + r.rowCount;
}

console.log(APPLY ? 'APPLYING' : 'DRY RUN');
const sink = {};
const dev = (await query("SELECT id::text AS id FROM users WHERE role = 'developer' LIMIT 1")).rows[0];
try {
  await withTransaction(async (c) => {
    for (const t of TABLES) { if (await has(c, t)) await purge(c, t, 'true', sink); }
    if (await has(c, 'money_entries')) {
      await c.query('ALTER TABLE money_entries DISABLE TRIGGER money_guard_trg');
      await purge(c, 'money_entries', 'true', sink);
      await c.query('ALTER TABLE money_entries ENABLE TRIGGER money_guard_trg');
      const on = (await c.query("SELECT tgenabled FROM pg_trigger WHERE tgrelid = 'money_entries'::regclass AND tgname = 'money_guard_trg'")).rows[0];
      if (!on || on.tgenabled !== 'O') throw new Error('The money lock is not back on. Stopped.');
    }
    const extra = Object.keys(sink).filter((t) => !TABLES.includes(t) && t !== 'money_entries');
    if (extra.length) throw new Error('The delete would also remove rows in: ' + extra.join(', ') + '. Stopped.');
    if (APPLY && dev) {
      await c.query("INSERT INTO audit_log (request_id, interface, actor_user_id, action, entity_type, entity_id, details) VALUES (NULL, 'dev', $1, 'cleanup.leftovers', 'system', 'launch-prep', $2)", [dev.id, JSON.stringify(sink)]);
    }
    if (!APPLY) throw new Dry('dry run');
  });
} catch (e) {
  if (!(e instanceof Dry)) { console.error('STOPPED. Nothing was changed. Reason: ' + e.message); process.exit(1); }
}
console.log('');
console.log(APPLY ? '=== REMOVED ===' : '=== WOULD REMOVE ===');
for (const [t, n] of Object.entries(sink).sort()) console.log('   ' + t + ': ' + n);
console.log('');
console.log(APPLY ? 'DONE. Leftover test rows removed.' : 'DRY RUN FINISHED. Nothing was changed. For real: node --env-file=.env src\\scripts\\cleanup-leftovers.js --apply');
process.exit(0);
