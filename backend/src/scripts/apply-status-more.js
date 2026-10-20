import fs from 'node:fs';
import path from 'node:path';
const file = path.resolve(process.cwd(), '../apps/m3labs/src/errorCatalog.js');
let s = fs.readFileSync(file, 'utf8');
if (s.includes('STATUS_MORE')) { console.log('Already done'); process.exit(0); }
const a = "import { API_ERRORS } from './errorsApi.js';";
const b = '[...BUILD_ERRORS, ...API_ERRORS]';
if (!s.includes(a) || !s.includes(b)) { console.log('NOT FOUND'); process.exit(1); }
s = s.replace(a, a + "\nimport { STATUS_MORE } from './errorsStatus.js';").replace(b, '[...BUILD_ERRORS, ...API_ERRORS, ...STATUS_MORE]');
fs.writeFileSync(file, s);
console.log('Patched');
