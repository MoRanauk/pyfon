import fs from 'fs';
const edits = [
  ['src/routes/groups.js', "import { devSqlRoutes } from './devSql.js';", "import { devSqlRoutes } from './devSql.js';\nimport { devCommandRoutes } from './devCommands.js';", 'devCommandRoutes }'],
  ['src/routes/groups.js', "devRoutes.use('/system', devSqlRoutes);", "devRoutes.use('/system', devSqlRoutes);\ndevRoutes.use('/system', devCommandRoutes);", "devRoutes.use('/system', devCommandRoutes)"],
  ['../apps/m3labs/src/App.jsx', "import DevApiTest from './DevApiTest.jsx';", "import DevApiTest from './DevApiTest.jsx';\nimport DevCommands from './DevCommands.jsx';\nimport DevLinks from './DevLinks.jsx';", 'DevLinks from'],
  ['../apps/m3labs/src/App.jsx', '<Route path="/api-test" element={<DevApiTest />} />', '<Route path="/api-test" element={<DevApiTest />} />\n        <Route path="/commands" element={<DevCommands />} />\n        <Route path="/links" element={<DevLinks />} />', '<DevLinks />'],
  ['../apps/m3labs/src/devNav.js', "['/commands', 'Commands', false]", "['/commands', 'Commands', true]", "'Commands', true"],
  ['../apps/m3labs/src/devNav.js', "['/links', 'Links', false]", "['/links', 'Links', true]", "'Links', true"],
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
