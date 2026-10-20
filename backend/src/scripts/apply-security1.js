import fs from 'fs';
const A = '../apps/m3labs/src/App.jsx';
const G = 'src/routes/groups.js';
const R = (k, p) => '\n        <Route path="/sec/' + k + '" element={<DevSecurity kind="' + k + '" />} />';
const E = [
 [G, "import { devUptimeRoutes } from './devUptime.js';", "\nimport { devSecurityRoutes } from './devSecurity.js';", "devSecurity.js"],
 [G, "devRoutes.use('/system', devUptimeRoutes);", "\ndevRoutes.use('/system', devSecurityRoutes);", "devSecurityRoutes);"],
 [A, "import DevUptime from './DevUptime.jsx';", "\nimport DevSecurity from './DevSecurity.jsx';", "DevSecurity.jsx"],
 [A, '<Route path="/uptime" element={<DevUptime />} />', R('scan') + R('logins') + R('deps') + R('secrets'), 'path="/sec/scan"'],
];
let bad = false;
for (const [f, find, add, check] of E) {
  const t = fs.readFileSync(f, 'utf8');
  if (t.includes(check)) { console.log('Already done: ' + f + ' ' + check); continue; }
  if (!t.includes(find)) { console.log('NOT FOUND: ' + f + ' ' + find); bad = true; continue; }
  fs.writeFileSync(f, t.replace(find, () => find + add));
  console.log('Patched: ' + f + ' ' + check);
}
const nav = '../apps/m3labs/src/devNav.js';
let n = fs.readFileSync(nav, 'utf8');
for (const [p, l] of [['/sec/scan', 'Security scan'], ['/sec/secrets', 'Secrets watch'], ['/sec/deps', 'Dependency audit'], ['/sec/logins', 'Login attacks']]) {
  const a = "['" + p + "', '" + l + "', false]";
  if (n.includes(a)) { n = n.replace(a, () => "['" + p + "', '" + l + "', true]"); console.log('Patched nav: ' + l); }
  else if (n.includes("'" + l + "', true]")) console.log('Already done nav: ' + l);
  else { console.log('NOT FOUND nav: ' + l); bad = true; }
}
fs.writeFileSync(nav, n);
if (bad) process.exit(1);
console.log('PASS patch');
