import fs from 'node:fs';
import path from 'node:path';
const file = path.resolve(process.cwd(), 'src/routes/groups.js');
let s = fs.readFileSync(file, 'utf8');
if (s.includes('devGraphRoutes')) { console.log('Already done'); process.exit(0); }
const a = "import { devUserRoutes } from './devUsers.js';";
const b = "devRoutes.use('/system', devUserRoutes);";
if (!s.includes(a) || !s.includes(b)) { console.log('NOT FOUND'); process.exit(1); }
s = s.replace(a, a + "\nimport { devGraphRoutes } from './devGraphs.js';");
s = s.replace(b, b + "\ndevRoutes.use('/system', devGraphRoutes);");
fs.writeFileSync(file, s);
console.log('Patched');
