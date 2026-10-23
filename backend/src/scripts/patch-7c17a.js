import fs from 'node:fs';
import path from 'node:path';
const f = path.resolve('src', 'routes', 'siteContent.js');
let s = fs.readFileSync(f, 'utf8');
let bad = 0;
function rep(a, b) {
  if (s.includes(b)) { console.log('Already done: ' + a.slice(0, 40)); return; }
  if (!s.includes(a)) { console.log('NOT FOUND: ' + a.slice(0, 50)); bad = 1; return; }
  s = s.replace(a, () => b); console.log('Patched: ' + a.slice(0, 40));
}
rep("'theme', 'navOrder'];", "'theme', 'navOrder', 'layout', 'blocks'];");
rep("if (v.length > 600) throw new Error('A text is longer than 600 characters');", "if (v.length > 600) throw new Error('A text is longer than 600 characters');\n    if (/^\\s*(javascript|data|vbscript):/i.test(v)) throw new Error('That link type is not allowed');");
fs.writeFileSync(f, s);
process.exit(bad);
