import fs from 'fs';
import path from 'path';

const src = path.resolve(process.cwd(), '../apps/m3labs/src');
let bad = false;

function patch(file, oldStr, newStr, doneMark) {
  const p = path.join(src, file);
  const t = fs.readFileSync(p, 'utf8');
  if (t.includes(doneMark)) { console.log(file + ': Already done'); return; }
  if (!t.includes(oldStr)) { console.log(file + ': NOT FOUND ' + oldStr); bad = true; return; }
  fs.writeFileSync(p, t.replace(oldStr, newStr));
  console.log(file + ': Patched');
}

patch('App.jsx',
  "import DevGraphs from './DevGraphs.jsx';",
  "import DevGraphs from './DevGraphs.jsx';\nimport DevReports from './DevReports.jsx';",
  "import DevReports");
patch('App.jsx',
  '<Route path="/graphs" element={<DevGraphs />} />',
  '<Route path="/graphs" element={<DevGraphs />} />\n        <Route path="/reports" element={<DevReports />} />',
  'path="/reports"');
patch('devNav.js',
  "['/reports', 'Reports', false]",
  "['/reports', 'Reports', true]",
  "['/reports', 'Reports', true]");

if (bad) { console.log('FAIL'); process.exit(1); }
console.log('PASS');
