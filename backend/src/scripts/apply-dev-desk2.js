import fs from 'node:fs';
let bad = 0;
function patch(file, old, neu, label) {
  const t = fs.readFileSync(file, 'utf8');
  if (t.includes(neu)) { console.log('Already done: ' + label); return; }
  if (!t.includes(old)) { console.log('NOT FOUND: ' + label); bad++; return; }
  fs.writeFileSync(file, t.replace(old, () => neu));
  console.log('Patched: ' + label);
}
const g = 'src/routes/groups.js';
patch(g, "import { partnerCsvRoutes } from './partnerCsv.js';", "import { partnerCsvRoutes } from './partnerCsv.js';\nimport { devSystemRoutes } from './devSystem.js';\nimport { devUserRoutes } from './devUsers.js';", 'groups import');
patch(g, 'devRoutes.use(partnerActivityRoutes);', "devRoutes.use(partnerActivityRoutes);\ndevRoutes.use('/system', devSystemRoutes);\ndevRoutes.use('/system', devUserRoutes);", 'groups mount');
const app = '../apps/m3labs/src/App.jsx';
patch(app, "import Tickets from './Tickets.jsx';", "import Tickets from './Tickets.jsx';\nimport DevHealth from './DevHealth.jsx';\nimport DevLogs from './DevLogs.jsx';\nimport DevUsers from './DevUsers.jsx';", 'App imports');
patch(app, '<Route path="/tickets" element={<Tickets />} />', '<Route path="/tickets" element={<Tickets />} />\n        <Route path="/health" element={<DevHealth />} />\n        <Route path="/logs" element={<DevLogs />} />\n        <Route path="/users" element={<DevUsers />} />', 'App routes');
patch('../apps/m3labs/src/Layout.jsx', "['/', 'home', 'Dashboard', true], ['/tickets', 'help', 'Tickets'], ['/activity'", "['/', 'home', 'Dashboard', true], ['/health', 'gear', 'System health'], ['/logs', 'list', 'Logs and traces'], ['/users', 'users', 'Users'], ['/tickets', 'help', 'Tickets'], ['/activity'", 'developer menu');
process.exit(bad ? 1 : 0);
