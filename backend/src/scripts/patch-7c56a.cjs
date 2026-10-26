const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const file = path.join(root, 'backend', 'src', 'app.js');
let src = fs.readFileSync(file, 'utf8');
const crlf = src.includes('\r\n');
src = src.replace(/\r\n/g, '\n');
if (src.includes('mediaRoutes')) { console.log('app.js already done'); process.exit(0); }
const imp = src.match(/^import[^\n]*siteVideos\.js['"];?[ \t]*$/m);
const use = src.match(/^[^\n]*app\.use\(\s*['"]\/v1\/videos['"][^\n]*$/m);
if (!imp) { console.log('NOT FOUND: the siteVideos import line in app.js'); process.exit(1); }
if (!use) { console.log('NOT FOUND: the /v1/videos mount line in app.js'); process.exit(1); }
src = src.replace(imp[0], () => imp[0] + "\nimport { mediaRoutes } from './routes/media.js';");
src = src.replace(use[0], () => use[0] + "\napp.use('/v1/media', mediaRoutes);");
if (crlf) src = src.replace(/\n/g, '\r\n');
fs.writeFileSync(file, src);
console.log('app.js patched');
