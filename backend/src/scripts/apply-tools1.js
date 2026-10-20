import fs from 'fs';
const edits = [
  ['src/routes/groups.js', "import { devSessionsRoutes } from './devSessions.js';", "import { devSessionsRoutes } from './devSessions.js';\nimport { devSqlRoutes } from './devSql.js';", 'devSqlRoutes }'],
  ['src/routes/groups.js', "devRoutes.use('/system', devSessionsRoutes);", "devRoutes.use('/system', devSessionsRoutes);\ndevRoutes.use('/system', devSqlRoutes);", "devRoutes.use('/system', devSqlRoutes)"],
  ['../apps/m3labs/src/App.jsx', "import DevSessions from './DevSessions.jsx';", "import DevSessions from './DevSessions.jsx';\nimport DevSql from './DevSql.jsx';\nimport DevApiTest from './DevApiTest.jsx';", 'DevApiTest from'],
  ['../apps/m3labs/src/App.jsx', '<Route path="/sessions" element={<DevSessions />} />', '<Route path="/sessions" element={<DevSessions />} />\n        <Route path="/sql" element={<DevSql />} />\n        <Route path="/api-test" element={<DevApiTest />} />', '<DevApiTest />'],
  ['../apps/m3labs/src/devNav.js', "['/sql', 'SQL console (read only)', false]", "['/sql', 'SQL console (read only)', true]", "(read only)', true"],
  ['../apps/m3labs/src/devNav.js', "['/api-test', 'API tester', false]", "['/api-test', 'API tester', true]", "'API tester', true"],
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
