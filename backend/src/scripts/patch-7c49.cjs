const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, 'cleanup-apply.js');
let src = fs.readFileSync(file, 'utf8');
const crlf = src.includes('\r\n');
src = src.replace(/\r\n/g, '\n');
if (src.includes("'DLR-EZ'")) { console.log('Already done'); process.exit(0); }
const A = `const TEST_DEALERS = ['DLR-TESTDEALER', 'DLR-TEST1'];`;
if (!src.includes(A)) { console.log('NOT FOUND: TEST_DEALERS line'); process.exit(1); }
src = src.replace(A, () => `const TEST_DEALERS = ['DLR-TESTDEALER', 'DLR-TEST1', 'DLR-EZ'];`);
if (crlf) src = src.replace(/\n/g, '\r\n');
fs.writeFileSync(file, src);
console.log('Patched');
