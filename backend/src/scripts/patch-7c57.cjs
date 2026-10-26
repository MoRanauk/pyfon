const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'app.js');
let s = fs.readFileSync(file, 'utf8');
const crlf = s.includes('\r\n');
s = s.replace(/\r\n/g, '\n');
if (s.includes('reviewRoutes')) { console.log('Already done'); process.exit(0); }
const importRe = /^import\s*\{\s*mediaRoutes\s*\}[^\n]*\n/m;
const mountRe = /^[^\n]*app\.use\(\s*['"]\/v1\/media['"][^\n]*\n/m;
if (!importRe.test(s) || !mountRe.test(s)) { console.log('NOT FOUND (media lines in app.js)'); process.exit(1); }
s = s.replace(importRe, (m) => m + "import { reviewRoutes } from './routes/reviews.js';\n");
s = s.replace(mountRe, (m) => m + "app.use('/v1/reviews', reviewRoutes);\n");
if (crlf) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(file, s);
console.log('Patched');
