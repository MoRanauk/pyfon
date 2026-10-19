import { query, pool } from '../db/pool.js';
const c = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'audit_log' ORDER BY ordinal_position");
console.log(c.rows.map((r) => r.column_name + ' ' + r.data_type).join('\n'));
console.log('--- actions');
const a = await query('SELECT action, count(*)::int AS n FROM audit_log GROUP BY action ORDER BY n DESC LIMIT 60');
console.log(a.rows.map((r) => r.action + ' ' + r.n).join('\n'));
await pool.end();
