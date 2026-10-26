import { query } from '../db/pool.js';

// READ ONLY. Lists every table with its row count. Changes nothing.
const t = (await query("SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' ORDER BY table_name")).rows;
const out = [];
for (const r of t) {
  try {
    const n = (await query('SELECT count(*)::int AS n FROM "' + r.table_name + '"')).rows[0].n;
    out.push(r.table_name + ' | ' + n);
  } catch (e) { out.push(r.table_name + ' | could not count'); }
}
console.log(out.join('\n'));
console.log('Done. Nothing was changed.');
process.exit(0);
