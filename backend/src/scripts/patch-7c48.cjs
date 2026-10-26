const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, 'cleanup-apply.js');
let src = fs.readFileSync(file, 'utf8');
const crlf = src.includes('\r\n');
src = src.replace(/\r\n/g, '\n');
if (src.includes("set.push(\"role = 'customer'\")")) { console.log('Already done'); process.exit(0); }
const A1 = `      if (uc.vendor_code && uc.vendor_code.nullable === 'YES') set.push('vendor_code = NULL');`;
const B1 = `      if (uc.vendor_code && u.role === 'vendor') { set.push("role = 'customer'"); set.push('vendor_code = NULL'); }`;
const A2 = `      if (uc.vendor_code && uc.vendor_code.nullable === 'YES') await c.query('UPDATE users SET vendor_code = NULL WHERE vendor_code = ANY($1::text[])', [TEST_DEALERS]);\n`;
if (!src.includes(A1)) { console.log('NOT FOUND: anonymise line'); process.exit(1); }
if (!src.includes(A2)) { console.log('NOT FOUND: dealer update line'); process.exit(1); }
src = src.replace(A1, () => B1).replace(A2, () => '');
if (crlf) src = src.replace(/\n/g, '\r\n');
fs.writeFileSync(file, src);
console.log('Patched');
