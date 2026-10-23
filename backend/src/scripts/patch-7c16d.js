import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve('..', 'apps', 'm3labs', 'src');
const f = (p) => p.replace(/[^/]*sql[^/]*$/i, 'builder');
const isPath = (v) => /^[a-z0-9\/_-]+$/.test(v);
const nf = path.join(dir, 'devNav.js');
const n = fs.readFileSync(nf, 'utf8');
if (n.includes('Site builder')) console.log('Already done: devNav.js');
else {
  const m = n.match(/\[[^\[\]]*sql[^\[\]]*\]/i) || n.match(/\{[^{}]*sql[^{}]*\}/i);
  if (!m) {
    console.log('NOT FOUND: sql entry in devNav.js. Lines with sql:');
    n.split('\n').filter((l) => /sql/i.test(l)).forEach((l) => console.log('  ' + l.trim()));
    process.exitCode = 1;
  } else {
    const e = m[0].replace(/(['"])([^'"]*sql[^'"]*)\1/gi, (a, q, v) => q + (isPath(v) ? f(v) : 'Site builder') + q);
    fs.writeFileSync(nf, n.replace(m[0], () => m[0] + ', ' + e));
    console.log('Patched: devNav.js  (copied ' + m[0] + ')');
  }
}
let found = false;
for (const file of fs.readdirSync(dir).filter((x) => /\.jsx?$/.test(x) && x !== 'devNav.js')) {
  const p = path.join(dir, file);
  const s = fs.readFileSync(p, 'utf8');
  const lines = s.split('\n');
  const i = lines.findIndex((l) => /^import \w+ from '\.\/\w*sql\w*\.jsx'/i.test(l));
  if (i < 0) continue;
  found = true;
  if (s.includes('SiteBuilder')) { console.log('Already done: ' + file); continue; }
  const comp = lines[i].match(/^import (\w+)/)[1];
  const r = lines.findIndex((l) => !/^import/.test(l) && new RegExp('<' + comp + '\\b').test(l));
  if (r < 0) { console.log('NOT FOUND: route line for ' + comp); process.exitCode = 1; continue; }
  const copy = lines[r]
    .replace(/path=(["'])([^"']*)\1/, (a, q, v) => 'path=' + q + f(v) + q)
    .replace(/path:\s*(["'])([^"']*)\1/, (a, q, v) => 'path: ' + q + f(v) + q)
    .replace(new RegExp('\\b' + comp + '\\b', 'g'), 'SiteBuilder');
  console.log('Route copied: ' + copy.trim());
  lines.splice(r + 1, 0, copy);
  lines.splice(i + 1, 0, "import SiteBuilder from './SiteBuilder.jsx';" + (lines[i].endsWith('\r') ? '\r' : ''));
  fs.writeFileSync(p, lines.join('\n'));
  console.log('Patched route in ' + file);
}
if (!found) { console.log('NOT FOUND: file importing the SQL page'); process.exitCode = 1; }
