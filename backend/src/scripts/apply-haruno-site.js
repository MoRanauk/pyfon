import fs from 'node:fs';
const file = 'src/routes/helpAsk.js';
let t = fs.readFileSync(file, 'utf8');
if (t.includes('sitePart')) { console.log('Already done'); process.exit(0); }
const eol = t.includes('\r\n') ? '\r\n' : '\n';
const fn = `function sitePart(site) {
  const s = String(site || '').replace(/[^A-Za-z0-9 &.,()'-]/g, '').slice(0, 100).trim();
  return s ? 'You are chatting on the website "' + s + '", which is operated by Pyfon Brands. Whenever you mention this site or are asked its name, say "' + s + '" and never just "Pyfon Brands". ' : '';
}

export const helpAskRoutes`.split('\n').join(eol);
const jobs = [
  ['const schema = z.object({', 'const schema = z.object({' + eol + "  site: z.string().trim().max(100).default('')," ],
  ['export const helpAskRoutes', fn],
  ['const system = PERSONA + ', 'const system = sitePart(body.site) + PERSONA + '],
];
for (const [a] of jobs) { if (t.split(a).length !== 2) { console.log('NOT FOUND or twice: ' + a); process.exit(1); } }
for (const [a, b] of jobs) { t = t.replace(a, () => b); }
fs.writeFileSync(file, t);
console.log('Patched');
