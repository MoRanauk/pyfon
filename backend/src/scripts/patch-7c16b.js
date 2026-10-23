import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve('..', 'apps', 'm3labs', 'src');
const rd = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(dir, f), s);
process.exitCode = 0;
const pn = rd('partnerNav.js');
const o = " ['/content', 'Site content', true],";
if (pn.includes(o)) { wr('partnerNav.js', pn.replace(o, () => '')); console.log('Patched: partnerNav.js (Site content removed)'); } else console.log('Already done: partnerNav.js');
for (const f of fs.readdirSync(dir).filter((x) => /\.jsx?$/.test(x) && x !== 'SiteContent.jsx')) {
  const t = rd(f);
  if (!/SiteContent/.test(t)) continue;
  wr(f, t.split('\n').filter((l) => !/SiteContent/.test(l)).join('\n'));
  console.log('Removed SiteContent lines in ' + f);
}
let n = rd('devNav.js');
const m = n.match(/\['([^']*)', 'SQL console', (?:true|false)\]/);
if (n.includes('Site builder')) console.log('Already done: devNav.js');
else if (!m) { console.log('NOT FOUND: SQL console in devNav.js'); process.exitCode = 1; }
else { wr('devNav.js', n.replace(m[0], () => m[0] + ", ['/builder', 'Site builder', true]")); console.log('Patched: devNav.js'); }
let found = false;
for (const f of fs.readdirSync(dir).filter((x) => /\.jsx?$/.test(x) && x !== 'devNav.js')) {
  const s = rd(f);
  const lines = s.split('\n');
  const i = lines.findIndex((l) => /^import \w+ from '\.\/\w*sql\w*\.jsx'/i.test(l));
  if (i < 0) continue;
  found = true;
  if (s.includes('SiteBuilder')) { console.log('Already done: ' + f); continue; }
  const comp = lines[i].match(/^import (\w+)/)[1];
  const r = lines.findIndex((l) => !/^import/.test(l) && new RegExp('<' + comp + '\\b').test(l));
  if (r < 0 || !m) { console.log('NOT FOUND: route line for ' + comp + ' in ' + f); process.exitCode = 1; continue; }
  let copy = lines[r];
  [m[1]].forEach((p) => { copy = copy.split("'" + p + "'").join("'/builder'").split('"' + p + '"').join('"/builder"'); });
  copy = copy.replace(new RegExp('\\b' + comp + '\\b', 'g'), 'SiteBuilder');
  lines.splice(r + 1, 0, copy);
  lines.splice(i + 1, 0, "import SiteBuilder from './SiteBuilder.jsx';" + (lines[i].endsWith('\r') ? '\r' : ''));
  wr(f, lines.join('\n'));
  console.log('Patched route in ' + f);
}
if (!found) { console.log('NOT FOUND: file importing the SQL page'); process.exitCode = 1; }
