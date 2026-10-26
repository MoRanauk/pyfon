import { query } from '../db/pool.js';
// READ ONLY. Shows the lock on money_entries and what site_content holds.
const short = (v) => (v === null || v === undefined ? '' : (typeof v === 'object' ? 'keys: ' + Object.keys(v).join(',') : String(v)).replace(/\s+/g, ' ').slice(0, 120));
console.log('=== LOCKS ON money_entries ===');
const t = (await query("SELECT t.tgname AS name, pg_get_triggerdef(t.oid) AS def, p.prosrc AS src FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid WHERE t.tgrelid = 'money_entries'::regclass AND NOT t.tgisinternal")).rows;
if (!t.length) console.log('   none found');
for (const r of t) { console.log('   ' + r.name); console.log('   ' + r.def); console.log(r.src); }
console.log('');
console.log('=== site_content ===');
for (const r of (await query('SELECT * FROM site_content')).rows) {
  console.log('   ' + Object.keys(r).map((k) => k + '=' + short(r[k])).join(' | '));
}
console.log('Done. Nothing was changed.');
process.exit(0);
