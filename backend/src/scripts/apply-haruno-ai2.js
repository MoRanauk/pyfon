import fs from 'node:fs';
function patch(file, jobs) {
  let t = fs.readFileSync(file, 'utf8');
  if (t.includes('askAi')) { console.log('Already done: ' + file); return true; }
  const eol = t.includes('\r\n') ? '\r\n' : '\n';
  for (const [a] of jobs) { if (!t.includes(a)) { console.log('NOT FOUND in ' + file + ': ' + a); return false; } }
  for (const [a, b] of jobs) { t = t.replace(a, () => b.split('\n').join(eol)); }
  fs.writeFileSync(file, t);
  console.log('Patched: ' + file);
  return true;
}
const imp = "import { askAi } from './askAi.js';\n";
const ok1 = patch('src/app.js', [
  ["import { publicDealerRoutes } from './routes/publicDealers.js';", "import { publicDealerRoutes } from './routes/publicDealers.js';\nimport { helpAskRoutes } from './routes/helpAsk.js';"],
  ["app.use('/v1/dealers', publicDealerRoutes);", "app.use('/v1/dealers', publicDealerRoutes);\napp.use('/v1/help', helpAskRoutes);"],
]);
const ok2 = patch('../apps/m3labs/src/Layout.jsx', [
  ["import { useEffect, useState } from 'react';", imp + "import { useEffect, useState } from 'react';"],
  ['<HelpButton path={loc.pathname}', '<HelpButton ai={askAi} path={loc.pathname}'],
]);
let ok3 = false;
{
  const f = '../apps/mco-brands/src/Layout.jsx';
  const t = fs.readFileSync(f, 'utf8');
  const n = t.split('<HelpButton ').length - 1;
  if (n === 1) ok3 = patch(f, [["import ", imp + "import "], ['<HelpButton ', '<HelpButton ai={askAi} ']]);
  else { console.log('NOT FOUND: expected one <HelpButton in the shop Layout, found ' + n); }
}
process.exit(ok1 && ok2 && ok3 ? 0 : 1);
