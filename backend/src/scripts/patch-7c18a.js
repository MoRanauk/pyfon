import fs from 'node:fs';
import path from 'node:path';
let bad = 0;
function rep(file, oldS, newS) {
  const s = fs.readFileSync(file, 'utf8');
  const name = path.basename(file);
  if (s.includes(newS)) { console.log('Already done: ' + name); return; }
  if (!s.includes(oldS)) { console.log('NOT FOUND in ' + name + ': ' + oldS.slice(0, 50)); bad = 1; return; }
  fs.writeFileSync(file, s.replace(oldS, () => newS));
  console.log('Patched: ' + name);
}
const g = path.resolve('src', 'routes', 'groups.js');
rep(g, "import { partnerCatalogRoutes } from './partnerCatalog.js';", "import { partnerCatalogRoutes } from './partnerCatalog.js';\nimport { partnerBrowseRoutes } from './partnerBrowse.js';");
rep(g, "partnerRoutes.use('/catalog', partnerCatalogRoutes);", "partnerRoutes.use('/catalog', partnerCatalogRoutes);\npartnerRoutes.use('/catalog', partnerBrowseRoutes);");
rep(g, "import { devCodeRoutes } from './devCode.js';", "import { devCodeRoutes } from './devCode.js';\nimport { devVaultRoutes } from './devVault.js';");
rep(g, "devRoutes.use('/system', devCodeRoutes);", "devRoutes.use('/system', devCodeRoutes);\ndevRoutes.use('/system', devVaultRoutes);");
const ef = path.resolve('.env');
if (fs.existsSync(ef)) {
  const e = fs.readFileSync(ef, 'utf8');
  const m = e.match(/^CORS_ORIGINS=(.*)$/m);
  if (!m) { console.log('NOT FOUND: CORS_ORIGINS in .env (add http://localhost:5177 yourself)'); bad = 1; }
  else if (m[1].includes('5177')) console.log('Already done: CORS 5177');
  else { fs.writeFileSync(ef, e.replace(m[0], () => m[0] + ',http://localhost:5177')); console.log('Patched: CORS_ORIGINS now allows 5177'); }
}
process.exit(bad);
