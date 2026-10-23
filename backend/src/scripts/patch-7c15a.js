import fs from 'node:fs';
import path from 'node:path';
let bad = 0;
export function rep(file, oldS, newS) {
  const s = fs.readFileSync(file, 'utf8');
  const name = path.basename(file);
  if (s.includes(newS)) { console.log('Already done: ' + name); return; }
  if (!s.includes(oldS)) { console.log('NOT FOUND in ' + name + ': ' + oldS.slice(0, 50)); bad = 1; return; }
  fs.writeFileSync(file, s.replace(oldS, () => newS));
  console.log('Patched: ' + name);
}
const g = path.resolve('src/routes/groups.js');
const a = path.resolve('src/app.js');
rep(g, "import { siteVideoAdminRoutes } from './siteVideos.js';", "import { siteVideoAdminRoutes } from './siteVideos.js';\nimport { partnerContentRoutes } from './siteContent.js';");
rep(g, "partnerRoutes.use('/videos', siteVideoAdminRoutes);", "partnerRoutes.use('/videos', siteVideoAdminRoutes);\npartnerRoutes.use('/content', partnerContentRoutes);");
rep(a, "import { helpAskRoutes } from './routes/helpAsk.js';", "import { helpAskRoutes } from './routes/helpAsk.js';\nimport { publicContentRoutes } from './routes/siteContent.js';");
rep(a, "app.use('/v1/help', helpAskRoutes);", "app.use('/v1/help', helpAskRoutes);\napp.use('/v1/content', publicContentRoutes);");
process.exit(bad);
