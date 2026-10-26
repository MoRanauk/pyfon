import { query } from '../db/pool.js';
import { withTransaction } from '../db/tx.js';

// Removes test data. DRY RUN by default: it does everything inside a transaction, prints counts, then rolls back.
//   node --env-file=.env src\scripts\cleanup-apply.js                                   (dry run)
//   node --env-file=.env src\scripts\cleanup-apply.js --apply --backup-done             (real)
//   add --include-maybe to also remove your own two ezra customer accounts
const APPLY = process.argv.includes('--apply');
const BACKUP = process.argv.includes('--backup-done');
const MAYBE_TOO = process.argv.includes('--include-maybe');
if (APPLY && !BACKUP) { console.log('Refusing to apply. Create the Neon branch "before-cleanup", then add --backup-done.'); process.exit(1); }

const TEST = [/@example\.com$/i, /@moblha\.com$/i, /@hopefunder\.com$/i, /\+d2@/i, /\+dealer@/i];
const MAYBE = ['ezra.o.monari@gmail.com', 'ezra.o.monari@students.uonbi.ac.ke'];
const KEEP_ROLES = ['partner', 'developer'];
const TEST_DEALERS = ['DLR-TESTDEALER', 'DLR-TEST1', 'DLR-EZ'];
const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
const kind = (u) => (KEEP_ROLES.includes(u.role) ? 'keep' : MAYBE.includes(String(u.email).toLowerCase()) ? 'maybe' : TEST.some((re) => re.test(String(u.email))) ? 'test' : 'review');
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
async function columns(c, table) {
  const r = await c.query("SELECT column_name AS n, is_nullable AS nullable, data_type AS t FROM information_schema.columns WHERE table_name = $1 AND table_schema = current_schema()", [table]);
  const m = {};
  for (const x of r.rows) m[x.n] = x;
  return m;
}

// Deletes the rows that match, after first deleting the rows in other tables that still point at them (NO ACTION links).
async function purge(c, table, where, params, sink, depth = 0) {
  if (depth > 6) throw new Error('Link chain too deep at ' + table);
  for (const f of await fks(c, table)) {
    if ((f.del !== 'a' && f.del !== 'r') || f.tbl === table) continue;
    const sub = q(f.col) + '::text IN (SELECT ' + q(f.refcol) + '::text FROM ' + table + ' WHERE ' + where + ')';
    await purge(c, f.tbl, sub, params, sink, depth + 1);
  }
  const r = await c.query('DELETE FROM ' + table + ' WHERE ' + where, params);
  if (r.rowCount) sink[table] = (sink[table] || 0) + r.rowCount;
}

const users = (await query('SELECT id::text AS id, email, role FROM users')).rows;
const doomed = users.filter((u) => { const k = kind(u); return k === 'test' || (MAYBE_TOO && k === 'maybe'); });
const ids = doomed.map((u) => u.id);
const dev = users.find((u) => u.role === 'developer');
console.log((APPLY ? 'APPLYING' : 'DRY RUN') + ': ' + doomed.length + ' user accounts in scope' + (MAYBE_TOO ? ' (including your ezra accounts)' : ' (your two ezra accounts are NOT included)'));

const sink = {};
const notes = [];
try {
  await withTransaction(async (c) => {
    // 1. Money book rows tied to the payments we are about to delete (kept, marked deleted)
    let moneyIds = [];
    if (await has(c, 'order_payments')) {
      const conds = ['created_by::text = ANY($1::text[])'];
      const fo = (await fks(c, 'orders')).find((f) => f.tbl === 'order_payments');
      if (fo) conds.push(q(fo.col) + '::text IN (SELECT ' + q(fo.refcol) + '::text FROM orders WHERE customer_id::text = ANY($1::text[]))');
      moneyIds = (await c.query('SELECT DISTINCT money_entry_id::text AS id FROM order_payments WHERE money_entry_id IS NOT NULL AND (' + conds.join(' OR ') + ')', [ids])).rows.map((r) => r.id);
    }
    // 2. Everything that belongs to the test accounts
    const roots = [
      ['orders', 'customer_id::text = ANY($1::text[])'],
      ['quote_requests', 'customer_id::text = ANY($1::text[])'],
      ['attachments', 'uploaded_by::text = ANY($1::text[])'],
      ['order_payments', 'created_by::text = ANY($1::text[])'],
      ['ticket_comments', 'author_id::text = ANY($1::text[])'],
      ['tickets', 'opened_by::text = ANY($1::text[])'],
      ['password_resets', 'user_id::text = ANY($1::text[])'],
    ];
    for (const [t, w] of roots) { if (await has(c, t)) await purge(c, t, w, [ids], sink); }
    // 3. Old password-help lists and queued/sent test messages (all test at this stage)
    for (const t of ['customer_password_help', 'password_help_requests', 'outbound_messages']) {
      if (await has(c, t)) { const r = await c.query('DELETE FROM ' + t); if (r.rowCount) sink[t] = (sink[t] || 0) + r.rowCount; }
    }
    // 4. Money book: soft delete only
    if (moneyIds.length) {
      const mc = await columns(c, 'money_entries');
      if (mc.deleted_at) {
        const r = await c.query('UPDATE money_entries SET deleted_at = now() WHERE id::text = ANY($1::text[]) AND deleted_at IS NULL', [moneyIds]);
        notes.push('money_entries: ' + r.rowCount + ' marked deleted (soft delete, rows kept)');
      } else notes.push('money_entries has no deleted_at column: ' + moneyIds.length + ' test rows LEFT ALONE');
    }
    // 5. The accounts: delete if nothing points at them, else anonymise (audit log must keep its rows)
    const uc = await columns(c, 'users');
    const userFks = (await fks(c, 'users')).filter((f) => f.del === 'a' || f.del === 'r');
    let deleted = 0;
    for (const u of doomed) {
      const why = [];
      for (const f of userFks) {
        const n = (await c.query('SELECT count(*)::int AS n FROM ' + f.tbl + ' WHERE ' + q(f.col) + '::text = $1', [u.id])).rows[0].n;
        if (n) why.push(f.tbl + '.' + f.col + ' ' + n);
      }
      if (!why.length) { await c.query('DELETE FROM users WHERE id::text = $1', [u.id]); deleted += 1; continue; }
      const set = ["email = 'removed-' || left(id::text, 8) || '@removed.invalid'"];
      if (uc.full_name) set.push("full_name = 'Removed user'");
      if (uc.phone) set.push(uc.phone.nullable === 'YES' ? 'phone = NULL' : "phone = ''");
      if (uc.password_hash) set.push("password_hash = '!'");
      if (uc.sessions_valid_after) set.push("sessions_valid_after = now() + interval '100 years'");
      if (uc.is_active && uc.is_active.t === 'boolean') set.push('is_active = false');
      if (uc.active && uc.active.t === 'boolean') set.push('active = false');
      if (uc.vendor_code && u.role === 'vendor') { set.push("role = 'customer'"); set.push('vendor_code = NULL'); }
      await c.query('UPDATE users SET ' + set.join(', ') + ' WHERE id::text = $1', [u.id]);
      notes.push('kept as anonymised (still named in: ' + why.join(', ') + '): ' + u.email);
    }
    if (deleted) sink['users (deleted)'] = deleted;
    // 6. Test dealers
    if (await has(c, 'vendors')) {
      if (await has(c, 'jobs')) { const jc = await columns(c, 'jobs'); if (jc.vendor_code) await c.query('UPDATE jobs SET vendor_code = NULL WHERE vendor_code = ANY($1::text[])', [TEST_DEALERS]); }
      const r = await c.query('DELETE FROM vendors WHERE code = ANY($1::text[])', [TEST_DEALERS]);
      if (r.rowCount) sink.vendors = r.rowCount;
    }
    // 7. Placeholder products (only these tables may be touched)
    const ph = {};
    await purge(c, 'catalog_items', "sku LIKE 'PH-%'", [], ph);
    const extra = Object.keys(ph).filter((t) => !['catalog_items', 'item_images', 'item_storefronts'].includes(t));
    if (extra.length) throw new Error('Placeholder delete would also remove rows in: ' + extra.join(', ') + '. Stopped.');
    for (const [t, n] of Object.entries(ph)) sink[t + ' (PH-)'] = n;
    // 8. Log it (real run only)
    if (APPLY && dev) {
      await c.query("INSERT INTO audit_log (request_id, interface, actor_user_id, action, entity_type, entity_id, details) VALUES (NULL, 'dev', $1, 'cleanup.test_data', 'system', 'launch-prep', $2)", [dev.id, JSON.stringify({ users: doomed.length, removed: sink })]);
    }
    if (!APPLY) throw new Dry('dry run');
  });
} catch (e) {
  if (!(e instanceof Dry)) { console.error('STOPPED. Nothing was changed. Reason: ' + e.message); process.exit(1); }
}

console.log('');
console.log(APPLY ? '=== REMOVED ===' : '=== WOULD REMOVE ===');
for (const [t, n] of Object.entries(sink).sort()) console.log('   ' + t + ': ' + n);
for (const n of notes) console.log('   ' + n);
console.log('');
console.log(APPLY ? 'DONE. Test data removed.' : 'DRY RUN FINISHED. Nothing was changed. To do it for real: node --env-file=.env src\\scripts\\cleanup-apply.js --apply --backup-done');
process.exit(0);
