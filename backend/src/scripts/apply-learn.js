import fs from 'fs';
const edits = [
  ['../apps/m3labs/src/App.jsx', "import DevCode from './DevCode.jsx';", "import DevCode from './DevCode.jsx';\nimport DevLearn from './DevLearn.jsx';", 'DevLearn from'],
  ['../apps/m3labs/src/App.jsx', '<Route path="/code" element={<DevCode />} />', '<Route path="/code" element={<DevCode />} />\n        <Route path="/learn" element={<DevLearn />} />', '<DevLearn />'],
  ['../apps/m3labs/src/devNav.js', "['/learn', 'Learn the code', false]", "['/learn', 'Learn the code', true]", "'Learn the code', true"],
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
