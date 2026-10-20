import fs from 'fs';
const edits = [
  ['../apps/m3labs/src/App.jsx', "import DevLearn from './DevLearn.jsx';", "import DevLearn from './DevLearn.jsx';\nimport DevGuides from './DevGuides.jsx';", 'DevGuides from'],
  ['../apps/m3labs/src/App.jsx', '<Route path="/learn" element={<DevLearn />} />', '<Route path="/learn" element={<DevLearn />} />\n        <Route path="/guide" element={<DevGuides />} />', '<DevGuides />'],
  ['../apps/m3labs/src/devNav.js', "['/guide', 'Guides', false]", "['/guide', 'Guides', true]", "'Guides', true"],
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
