import fs from 'node:fs';
import path from 'node:path';
let bad = 0;
const f = path.resolve('..', 'apps', 'gift-hub', 'src', 'Layout.jsx');
function rep(oldS, newS) {
  const s = fs.readFileSync(f, 'utf8');
  if (s.includes(newS)) { console.log('Already done: ' + oldS.slice(0, 40)); return; }
  if (!s.includes(oldS)) { console.log('NOT FOUND: ' + oldS.slice(0, 50)); bad = 1; return; }
  fs.writeFileSync(f, s.replace(oldS, () => newS));
  console.log('Patched: ' + oldS.slice(0, 40));
}
rep("import { img, API_URL } from './api.js';", "import { img, API_URL } from './api.js';\nimport { useSiteEdit } from './siteEdit.js';");
rep('const [ann, setAnn] = useState(true);', 'useSiteEdit(content, setContent, CONTENT);\n  const [ann, setAnn] = useState(true);');
rep('const msgs = content.announce;', 'const msgs = content.announce;\n  const navOrder = content.navOrder || [];\n  const pos = (t) => { const i = navOrder.indexOf(t.title); return i < 0 ? 99 : i; };\n  const navList = navOrder.length ? [...NAVTREE].sort((a, b) => pos(a) - pos(b)) : NAVTREE;');
rep('{NAVTREE.map((t) => {', '{navList.map((t) => {');
rep("'--pf-hero': mood === 'him' ? HIM : HER, background:", "'--pf-hero': mood === 'him' ? HIM : HER, ...(content.theme || {}), background:");
let s = fs.readFileSync(f, 'utf8');
if (s.includes('data-nt=')) console.log('Already done: data-nt');
else { fs.writeFileSync(f, s.split('<div key={t.title} className="dd').join('<div key={t.title} data-nt={t.title} className="dd')); console.log('Patched: data-nt'); }
process.exit(bad);
