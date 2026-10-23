import fs from 'node:fs';
import path from 'node:path';
const p = path.resolve(process.cwd(), '..', 'packages', 'api-client', 'index.js');
const raw = fs.readFileSync(p, 'utf8');
const crlf = raw.includes('\r\n');
let t = raw.replace(/\r\n/g, '\n');
const find = '    const token = getToken ? getToken() : null;';
if (t.includes('opts.token ||')) { console.log('Already done'); process.exit(0); }
if (!t.includes(find)) { console.log('NOT FOUND'); process.exit(1); }
t = t.replace(find, () => '    const token = opts.token || (getToken ? getToken() : null);');
fs.writeFileSync(p, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('Patched');
