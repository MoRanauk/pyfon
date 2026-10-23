import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve('..', 'apps', 'm3labs', 'src');
const nav = path.join(dir, 'partnerNav.js');
let n = fs.readFileSync(nav, 'utf8');
const oldN = "['/videos', 'Videos', true],";
if (n.includes("'/content'")) console.log('Already done: partnerNav.js');
else if (!n.includes(oldN)) { console.log('NOT FOUND in partnerNav.js'); process.exitCode = 1; }
else { fs.writeFileSync(nav, n.replace(oldN, () => oldN + " ['/content', 'Site content', true],")); console.log('Patched: partnerNav.js'); }
let found = false;
for (const f of fs.readdirSync(dir).filter((x) => /\.jsx?$/.test(x))) {
  const p = path.join(dir, f);
  const s = fs.readFileSync(p, 'utf8');
  const lines = s.split('\n');
  const i = lines.findIndex((l) => /^import Tickets from ['"]\.\/Tickets\.jsx['"]/.test(l));
  if (i < 0) continue;
  found = true;
  if (s.includes('SiteContent')) { console.log('Already done: ' + f); continue; }
  const r = lines.findIndex((l, k) => k !== i && /\/tickets/.test(l) && /Tickets/.test(l) && !/^import/.test(l));
  if (r < 0) { console.log('NOT FOUND: route line for /tickets in ' + f); process.exitCode = 1; continue; }
  const copy = lines[r].replace(/\/tickets/g, '/content').replace(/Tickets/g, 'SiteContent');
  lines.splice(r + 1, 0, copy);
  lines.splice(i + 1, 0, "import SiteContent from './SiteContent.jsx';" + (lines[i].endsWith('\r') ? '\r' : ''));
  fs.writeFileSync(p, lines.join('\n'));
  console.log('Patched route in ' + f);
}
if (!found) { console.log('NOT FOUND: file importing Tickets'); process.exitCode = 1; }
