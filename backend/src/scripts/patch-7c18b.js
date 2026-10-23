import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve('..', 'apps', 'm3labs', 'src');
const rd = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(dir, f), s);
process.exitCode = 0;
const nf = 'devNav.js';
const n = rd(nf);
if (n.includes('Code vault')) console.log('Already done: devNav.js');
else {
  const m = n.match(/\['\/builder'[^\]]*\]/);
  if (!m) { console.log('NOT FOUND: Site builder entry in devNav.js. Lines with builder:'); n.split('\n').filter((l) => /builder/i.test(l)).forEach((l) => console.log('  ' + l.trim())); process.exitCode = 1; }
  else { wr(nf, n.replace(m[0], () => m[0] + ", ['/vault', 'Code vault', true]")); console.log('Patched: devNav.js'); }
}
let found = false;
for (const f of fs.readdirSync(dir).filter((x) => /\.jsx?$/.test(x) && x !== 'devNav.js')) {
  const s = rd(f);
  const lines = s.split('\n');
  const i = lines.findIndex((l) => /^import SiteBuilder from /.test(l));
  if (i < 0) continue;
  found = true;
  if (s.includes('CodeVault')) { console.log('Already done: ' + f); continue; }
  const r = lines.findIndex((l) => !/^import/.test(l) && /SiteBuilder/.test(l));
  if (r < 0) { console.log('NOT FOUND: route line for SiteBuilder in ' + f); process.exitCode = 1; continue; }
  const copy = lines[r].replace(/\/builder/g, '/vault').replace(/SiteBuilder/g, 'CodeVault');
  lines.splice(r + 1, 0, copy);
  lines.splice(i + 1, 0, "import CodeVault from './CodeVault.jsx';" + (lines[i].endsWith('\r') ? '\r' : ''));
  wr(f, lines.join('\n'));
  console.log('Patched route in ' + f + ': ' + copy.trim());
}
if (!found) { console.log('NOT FOUND: file importing SiteBuilder (was Block B2 of 7c16 applied?)'); process.exitCode = 1; }
