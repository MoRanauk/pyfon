import fs from 'fs';
const E = [
 ['src/routes/groups.js', "import { devGraphRoutes } from './devGraphs.js';", "\nimport { devUptimeRoutes } from './devUptime.js';", "devUptime.js"],
 ['src/routes/groups.js', "devRoutes.use('/system', devGraphRoutes);", "\ndevRoutes.use('/system', devUptimeRoutes);", "devUptimeRoutes);"],
 ['../apps/m3labs/src/App.jsx', "import DevGraphs from './DevGraphs.jsx';", "\nimport DevUptime from './DevUptime.jsx';", "DevUptime.jsx"],
 ['../apps/m3labs/src/App.jsx', '<Route path="/graphs" element={<DevGraphs />} />', '\n        <Route path="/uptime" element={<DevUptime />} />', 'path="/uptime"'],
];
let bad = false;
for (const [f, find, add, check] of E) {
  const t = fs.readFileSync(f, 'utf8');
  if (t.includes(check)) { console.log('Already done: ' + f); continue; }
  if (!t.includes(find)) { console.log('NOT FOUND: ' + f + ' ' + find); bad = true; continue; }
  fs.writeFileSync(f, t.replace(find, () => find + add));
  console.log('Patched: ' + f);
}
const nav = '../apps/m3labs/src/devNav.js';
let n = fs.readFileSync(nav, 'utf8');
const a = "['/uptime', 'Uptime and alerts', false]";
if (n.includes(a)) { fs.writeFileSync(nav, n.replace(a, () => "['/uptime', 'Uptime and alerts', true]")); console.log('Patched: devNav'); }
else if (n.includes("'Uptime and alerts', true]")) console.log('Already done: devNav');
else { console.log('NOT FOUND: devNav'); bad = true; }
if (bad) process.exit(1);
console.log('PASS patch');
