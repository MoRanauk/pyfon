import fs from 'fs';
const edits = [
  ['src/routes/groups.js', "import { devSecurityLabRoutes } from './devSecurityLab.js';", "import { devSecurityLabRoutes } from './devSecurityLab.js';\nimport { devSessionsRoutes } from './devSessions.js';", 'devSessionsRoutes }'],
  ['src/routes/groups.js', "devRoutes.use('/system', devSecurityLabRoutes);", "devRoutes.use('/system', devSecurityLabRoutes);\ndevRoutes.use('/system', devSessionsRoutes);", "devRoutes.use('/system', devSessionsRoutes)"],
  ['../apps/m3labs/src/App.jsx', "import DevSecLab from './DevSecLab.jsx';", "import DevSecLab from './DevSecLab.jsx';\nimport DevSessions from './DevSessions.jsx';", 'DevSessions from'],
  ['../apps/m3labs/src/App.jsx', '<Route path="/sec/pentest" element={<DevSecLab key="pentest" kind="pentest" />} />', '<Route path="/sec/pentest" element={<DevSecLab key="pentest" kind="pentest" />} />\n        <Route path="/sessions" element={<DevSessions />} />', '<DevSessions />'],
  ['../apps/m3labs/src/devNav.js', "['/sessions', 'Live sessions', false]", "['/sessions', 'Live sessions', true]", "'Live sessions', true"],
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
