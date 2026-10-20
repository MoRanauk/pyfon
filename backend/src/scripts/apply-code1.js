import fs from 'fs';
const edits = [
  ['src/routes/groups.js', "import { devCommandRoutes } from './devCommands.js';", "import { devCommandRoutes } from './devCommands.js';\nimport { devCodeRoutes } from './devCode.js';", 'devCodeRoutes }'],
  ['src/routes/groups.js', "devRoutes.use('/system', devCommandRoutes);", "devRoutes.use('/system', devCommandRoutes);\ndevRoutes.use('/system', devCodeRoutes);", "devRoutes.use('/system', devCodeRoutes)"],
  ['../apps/m3labs/src/App.jsx', "import DevLinks from './DevLinks.jsx';", "import DevLinks from './DevLinks.jsx';\nimport DevDbMap from './DevDbMap.jsx';\nimport DevCode from './DevCode.jsx';", 'DevCode from'],
  ['../apps/m3labs/src/App.jsx', '<Route path="/links" element={<DevLinks />} />', '<Route path="/links" element={<DevLinks />} />\n        <Route path="/db" element={<DevDbMap />} />\n        <Route path="/code" element={<DevCode />} />', '<DevDbMap />'],
  ['../apps/m3labs/src/devNav.js', "['/code', 'Code explorer', false]", "['/code', 'Code explorer', true]", "'Code explorer', true"],
  ['../apps/m3labs/src/devNav.js', "['/db', 'Database map', false]", "['/db', 'Database map', true]", "'Database map', true"],
];
let bad = false;
for (const [file, find, rep, done] of edits) {
  const t = fs.readFileSync(file, 'utf8');
  if (t.includes(done)) { console.log('Already done: ' + done); continue; }
  if (!t.includes(find)) { console.log('NOT FOUND: ' + find); bad = true; continue; }
  fs.writeFileSync(file, t.replace(find, () => rep));
  console.log('Patched: ' + done);
}
process.exit(bad ? 1 : 0);
