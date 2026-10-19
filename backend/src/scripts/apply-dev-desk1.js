import fs from 'node:fs';
let bad = 0;
function patch(file, old, neu, label) {
  const t = fs.readFileSync(file, 'utf8');
  if (t.includes(neu)) { console.log('Already done: ' + label); return; }
  if (!t.includes(old)) { console.log('NOT FOUND: ' + label); bad++; return; }
  fs.writeFileSync(file, t.replace(old, () => neu));
  console.log('Patched: ' + label);
}
const app = '../apps/m3labs/src/App.jsx';
patch(app, "import CsvImport from './CsvImport.jsx';", "import CsvImport from './CsvImport.jsx';\nimport Tickets from './Tickets.jsx';", 'App import');
patch(app, '<Route path="/csv" element={<CsvImport />} />', '<Route path="/csv" element={<CsvImport />} />\n        <Route path="/tickets" element={<Tickets />} />', 'App route');
const lay = '../apps/m3labs/src/Layout.jsx';
patch(lay, "['/connect', 'chat', 'Connect'],", "['/connect', 'chat', 'Connect'], ['/tickets', 'help', 'Tickets'],", 'partner menu');
patch(lay, "['/', 'home', 'Dashboard', true], ['/videos', 'video', 'Videos'], ['/tools', 'tools', 'Workspace tools'],", "['/', 'home', 'Dashboard', true], ['/tickets', 'help', 'Tickets'], ['/activity', 'list', 'Activity log'], ['/videos', 'video', 'Videos'], ['/tools', 'tools', 'Workspace tools'],", 'developer menu');
const act = '../apps/m3labs/src/Activity.jsx';
patch(act, "import { get } from './http.js';", "import { get } from './http.js';\nimport { STAGE } from './api.js';", 'Activity import');
patch(act, "return '/v1/partner/activity?' + p.toString();", "return (STAGE === 'dev' ? '/v1/dev' : '/v1/partner') + '/activity?' + p.toString();", 'Activity path');
patch('src/routes/groups.js', "devRoutes.use('/videos', siteVideoAdminRoutes);", "devRoutes.use('/videos', siteVideoAdminRoutes);\ndevRoutes.use(partnerActivityRoutes);", 'dev activity route');
process.exit(bad ? 1 : 0);
