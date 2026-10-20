import fs from 'node:fs';
import path from 'node:path';
const file = path.resolve(process.cwd(), '../apps/m3labs/src/Layout.jsx');
let s = fs.readFileSync(file, 'utf8');
if (s.includes('DEV_MENU')) { console.log('Already done'); process.exit(0); }
const a = "import { DEV_NAV } from './devNav.js';";
const b = 'DEV_NAV.map((g)';
if (!s.includes(a) || !s.includes(b)) { console.log('NOT FOUND'); process.exit(1); }
s = s.replace(a, "import { DEV_NAV as DEV_MENU } from './devNav.js';").replace(b, 'DEV_MENU.map((g)');
fs.writeFileSync(file, s);
console.log('Patched');
