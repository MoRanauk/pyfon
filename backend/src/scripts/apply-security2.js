import fs from 'fs';
const edits = [
  ['src/routes/groups.js', "import { devSecurityRoutes } from './devSecurity.js';", "import { devSecurityRoutes } from './devSecurity.js';\nimport { devSecurityLabRoutes } from './devSecurityLab.js';", 'devSecurityLabRoutes'],
  ['src/routes/groups.js', "devRoutes.use('/system', devSecurityRoutes);", "devRoutes.use('/system', devSecurityRoutes);\ndevRoutes.use('/system', devSecurityLabRoutes);", "devRoutes.use('/system', devSecurityLabRoutes)"],
  ['../apps/m3labs/src/App.jsx', "import DevSecurity from './DevSecurity.jsx';", "import DevSecurity from './DevSecurity.jsx';\nimport DevSecLab from './DevSecLab.jsx';", 'DevSecLab from'],
  ['../apps/m3labs/src/App.jsx', '<Route path="/sec/secrets" element={<DevSecurity kind="secrets" />} />', '<Route path="/sec/secrets" element={<DevSecurity kind="secrets" />} />\n        <Route path="/sec/access" element={<DevSecLab key="access" kind="access" />} />\n        <Route path="/sec/pentest" element={<DevSecLab key="pentest" kind="pentest" />} />', 'kind="access"'],
  ['../apps/m3labs/src/devNav.js', "['/sec/access', 'Access matrix test', false]", "['/sec/access', 'Access matrix test', true]", "'Access matrix test', true"],
  ['../apps/m3labs/src/devNav.js', "['/sec/pentest', 'Pen-test lab (own system only)', false]", "['/sec/pentest', 'Pen-test lab (own system only)', true]", "own system only)', true"],
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
