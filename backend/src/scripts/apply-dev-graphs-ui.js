import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(process.cwd(), '../apps/m3labs/src/');
let miss = 0;
function patch(name, steps) {
  const file = path.join(dir, name);
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes('DevGraphs') || s.includes("'/errors?q='")) { console.log(name + ': Already done'); return; }
  for (const [a, b, all] of steps) {
    if (!s.includes(a)) { console.log(name + ': NOT FOUND ' + a.slice(0, 40)); miss = 1; return; }
    s = all ? s.split(a).join(b) : s.replace(a, b);
  }
  fs.writeFileSync(file, s);
  console.log(name + ': Patched');
}
patch('App.jsx', [
  ["import ErrorExplainer from './ErrorExplainer.jsx';", "import ErrorExplainer from './ErrorExplainer.jsx';\nimport DevGraphs from './DevGraphs.jsx';"],
  ['<Route path="/errors" element={<ErrorExplainer />} />', '<Route path="/errors" element={<ErrorExplainer />} />\n        <Route path="/graphs" element={<DevGraphs />} />'],
]);
patch('devNav.js', [["['/graphs', 'Traffic graphs', false]", "['/graphs', 'Traffic graphs', true]"]]);
patch('DevHealth.jsx', [
  ["import { get } from './http.js';", "import { Link } from 'react-router-dom';\nimport { get } from './http.js';"],
  ['{s.status} {s.method} {s.path}', "<Link to={'/errors?q=' + s.status} title=\"What does this mean?\">{s.status}</Link> {s.method} {s.path}"],
]);
patch('DevLogs.jsx', [
  ["import { get } from './http.js';", "import { Link } from 'react-router-dom';\nimport { get } from './http.js';"],
  ['<b style={{ color: color(r.status) }}>{r.status}</b>', "<Link to={'/errors?q=' + r.status} title=\"What does this mean?\" style={{ color: color(r.status), fontWeight: 700 }}>{r.status}</Link>", true],
]);
process.exit(miss);
