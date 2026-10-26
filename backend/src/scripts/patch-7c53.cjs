const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, 'cleanup-leftovers.js');
let src = fs.readFileSync(file, 'utf8');
const crlf = src.includes('\r\n');
src = src.replace(/\r\n/g, '\n');
const A = `'code_vault', 'site_content_history', 'site_content', 'money_entries'];`;
if (!src.includes(A)) { console.log(src.includes(`'code_vault'];`) ? 'Already done' : 'NOT FOUND: TABLES line'); process.exit(src.includes(`'code_vault'];`) ? 0 : 1); }
src = src.replace(A, () => `'code_vault'];`);
if (crlf) src = src.replace(/\n/g, '\r\n');
fs.writeFileSync(file, src);
console.log('Patched');
