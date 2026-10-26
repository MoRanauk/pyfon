const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const apps = ['mco-brands', 'gift-hub', 'trim-atelier', 'm3labs', 'studio', 'dealer'];
const out = [];
const log = [];
let bad = false;
for (const a of apps) {
  const rel = 'apps/' + a + '/src/main.jsx';
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) { log.push('MISSING ' + rel + ' (skipped)'); continue; }
  const raw = fs.readFileSync(full, 'utf8');
  const crlf = raw.includes('\r\n');
  let s = raw.replace(/\r\n/g, '\n');
  if (s.includes('startThemeMode')) { log.push('already ' + rel); continue; }
  const m = s.match(/^import[^\n]*;\n/gm);
  if (!m) { log.push('NOT FOUND imports in ' + rel); bad = true; continue; }
  const last = m[m.length - 1];
  const idx = s.lastIndexOf(last) + last.length;
  s = s.slice(0, idx) + "import { startThemeMode } from '@pyfon/ui';\nstartThemeMode();\n" + s.slice(idx);
  out.push({ full, s, crlf });
  log.push('ok ' + rel);
}
console.log(log.join('\n'));
if (bad) { console.log('FAIL: nothing was written. Paste this output in the chat.'); process.exit(1); }
for (const o of out) fs.writeFileSync(o.full, o.crlf ? o.s.replace(/\n/g, '\r\n') : o.s);
console.log('PASS: ' + out.length + ' files written');
