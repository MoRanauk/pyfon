const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, 'cleanup-leftovers.js');
let src = fs.readFileSync(file, 'utf8');
const crlf = src.includes('\r\n');
src = src.replace(/\r\n/g, '\n');
if (src.includes('money_guard_trg')) { console.log('Already done'); process.exit(0); }
const A1 = `'code_vault'];`;
const B1 = `'code_vault', 'site_content_history', 'site_content'];`;
const A2 = `    for (const t of TABLES) { if (await has(c, t)) await purge(c, t, 'true', sink); }\n`;
const B2 = A2 + `    if (await has(c, 'money_entries')) {
      await c.query('ALTER TABLE money_entries DISABLE TRIGGER money_guard_trg');
      await purge(c, 'money_entries', 'true', sink);
      await c.query('ALTER TABLE money_entries ENABLE TRIGGER money_guard_trg');
      const on = (await c.query("SELECT tgenabled FROM pg_trigger WHERE tgrelid = 'money_entries'::regclass AND tgname = 'money_guard_trg'")).rows[0];
      if (!on || on.tgenabled !== 'O') throw new Error('The money lock is not back on. Stopped.');
    }
`;
const A3 = `const extra = Object.keys(sink).filter((t) => !TABLES.includes(t));`;
const B3 = `const extra = Object.keys(sink).filter((t) => !TABLES.includes(t) && t !== 'money_entries');`;
for (const a of [A1, A2, A3]) { if (!src.includes(a)) { console.log('NOT FOUND: ' + a.slice(0, 50)); process.exit(1); } }
src = src.replace(A1, () => B1).replace(A2, () => B2).replace(A3, () => B3);
if (crlf) src = src.replace(/\n/g, '\r\n');
fs.writeFileSync(file, src);
console.log('Patched');
