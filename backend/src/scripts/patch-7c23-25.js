import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.cwd(), '..');
const jobs = [
  ['backend/src/routes/groups.js', [
    ["import { devVaultRoutes } from './devVault.js';", "import { devThemeRoutes } from './devTheme.js';", 'after'],
    ["devRoutes.use('/system', devVaultRoutes);", "devRoutes.use('/theme', devThemeRoutes);", 'after'],
  ]],
  ['apps/m3labs/src/App.jsx', [
    ["import CodeVault from './CodeVault.jsx';", "import ThemeManager from './ThemeManager.jsx';", 'after'],
    ['<Route path="/vault" element={<CodeVault />} />', '        <Route path="/theme" element={<ThemeManager />} />', 'after'],
  ]],
  ['apps/m3labs/src/devNav.js', [
    ["['/vault', 'Code vault', true],", "['/vault', 'Code vault', true], ['/theme', 'Theme manager', true],", 'swap'],
  ]],
  ['apps/gift-hub/src/App.jsx', [
    ["import Series from './Series.jsx';", "import Series from './PersonalisedRoute.jsx';", 'swap'],
  ]],
];
const out = [];
let miss = false;
for (const [rel, edits] of jobs) {
  const file = path.join(root, rel);
  let txt = fs.readFileSync(file, 'utf8');
  const nl = txt.includes('\r\n') ? '\r\n' : '\n';
  for (const [find, add, mode] of edits) {
    if (txt.includes(add)) { console.log('Already done: ' + rel + ' :: ' + add.slice(0, 40)); continue; }
    if (!txt.includes(find)) { console.log('NOT FOUND: ' + rel + ' :: ' + find); miss = true; continue; }
    txt = txt.replace(find, () => (mode === 'after' ? find + nl + add : add));
    console.log('Patched: ' + rel + ' :: ' + add.slice(0, 40));
  }
  out.push([file, txt]);
}
if (miss) { console.log('FAIL: nothing was written'); process.exit(1); }
for (const [file, txt] of out) fs.writeFileSync(file, txt);
console.log('PASS patches written');
