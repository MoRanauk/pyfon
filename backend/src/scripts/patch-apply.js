import fs from 'node:fs';
import path from 'node:path';
const p = path.resolve(process.cwd(), 'src', 'app.js');
if (!fs.existsSync(p)) { console.log('NOT FOUND: src/app.js'); process.exit(1); }
const raw = fs.readFileSync(p, 'utf8');
const crlf = raw.includes('\r\n');
let t = raw.replace(/\r\n/g, '\n');
if (t.includes('/v1/apply')) { console.log('Already done'); process.exit(0); }
const imp = t.match(/^import[^\n]*publicPasswordHelp[^\n]*$/m);
const use = t.match(/^[^\n]*\/v1\/password-help[^\n]*$/m);
if (!imp || !use) { console.log('NOT FOUND: password-help lines in app.js'); process.exit(1); }
const base = imp[0].match(/from\s+'([^']*)publicPasswordHelp\.js'/);
const tgt = use[0].match(/^(\s*)(\w+)\.use\(/);
if (!base || !tgt || !/;\s*$/.test(use[0])) { console.log('NOT FOUND: lines are in a style I cannot copy safely'); process.exit(1); }
t = t.replace(imp[0], () => imp[0] + "\nimport publicApply from '" + base[1] + "publicApply.js';");
t = t.replace(use[0], () => use[0] + '\n' + tgt[1] + tgt[2] + ".use('/v1/apply', publicApply);");
fs.writeFileSync(p, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('Patched');
