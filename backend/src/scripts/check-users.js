import { pool, query } from '../db/pool.js';

// Read-only check of accounts and recent login attempts. Prints no passwords or hashes.
try {
  const u = await query("SELECT email, role, partner_stage, is_active, must_change_password FROM users ORDER BY role, email");
  console.log('--- accounts ---');
  for (const r of u.rows) console.log([r.email, r.role, r.partner_stage || '-', 'active=' + r.is_active, 'must_change=' + r.must_change_password].join(' | '));
  const a = await query("SELECT * FROM audit_log WHERE action LIKE 'auth.%' OR action LIKE 'user.%' ORDER BY 1 DESC LIMIT 12");
  console.log('--- recent login events ---');
  for (const r of a.rows) {
    const t = r.created_at || r.at || r.occurred_at || '';
    const who = r.actor_user_id === null || r.actor_user_id === undefined ? 'NO MATCHING USER' : 'user found';
    console.log([String(t).slice(0, 19), r.action, who, JSON.stringify(r.details || {})].join(' | '));
  }
} catch (e) {
  console.error('Error: ' + e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
