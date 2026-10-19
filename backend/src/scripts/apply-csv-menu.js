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
patch(app, "import Approvals from './Approvals.jsx';", "import Approvals from './Approvals.jsx';\nimport CsvImport from './CsvImport.jsx';", 'App import');
patch(app, '<Route path="/approvals" element={<Approvals />} />', '<Route path="/approvals" element={<Approvals />} />\n        <Route path="/csv" element={<CsvImport />} />', 'App route');
patch('../apps/m3labs/src/Layout.jsx', "['/products', 'box', 'Products'], ['/approvals'", "['/products', 'box', 'Products'], ['/csv', 'box', 'Product file'], ['/approvals'", 'menu item');
process.exit(bad ? 1 : 0);
