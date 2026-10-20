import { pool } from '../db/pool.js';
const c = await pool.connect();
let ok = true;
async function expectFail(sql, params, name) {
  await c.query('SAVEPOINT s');
  try { await c.query(sql, params); console.log('FAIL allowed: ' + name); ok = false; }
  catch (e) { console.log('ok blocked: ' + name); }
  await c.query('ROLLBACK TO s');
}
try {
  await c.query('BEGIN');
  const u = await c.query("SELECT id FROM users WHERE role = 'partner' LIMIT 1");
  const ins = await c.query("INSERT INTO money_entries (entry_date, kind, category, amount_kes, created_by) VALUES (CURRENT_DATE, 'income', 'Sales', 500, $1) RETURNING id", [u.rows[0].id]);
  const id = ins.rows[0].id;
  await expectFail('UPDATE money_entries SET amount_kes = 900 WHERE id = $1', [id], 'edit amount');
  await expectFail('DELETE FROM money_entries WHERE id = $1', [id], 'hard delete');
  await c.query("UPDATE money_entries SET deleted_at = now(), deleted_reason = 'test' WHERE id = $1", [id]);
  console.log('ok soft delete allowed');
  await expectFail('UPDATE money_entries SET deleted_at = NULL WHERE id = $1', [id], 'undelete');
} catch (e) { console.log('ERROR ' + e.message); ok = false; }
finally { await c.query('ROLLBACK'); c.release(); await pool.end(); }
console.log(ok ? 'PASS money guard' : 'FAIL money guard');
process.exitCode = ok ? 0 : 1;
