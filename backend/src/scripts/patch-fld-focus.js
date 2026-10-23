import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const NEW = [
  'function Fld({ f, up, label, k, ...p }) {',
  '  return <label className="jx-lab"><small>{label}</small><input className="jx-in" value={f[k]} onChange={up(k)} {...p} /></label>;',
  '}',
  '',
];
let miss = false;
const pending = [];
for (const app of ['prestige-m', 'trim-atelier']) {
  const rel = 'apps/' + app + '/src/Checkout.jsx';
  const full = path.join(root, rel);
  const raw = fs.readFileSync(full, 'utf8');
  if (raw.includes('function Fld(')) { console.log('Already done: ' + rel); continue; }
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  const defAt = lines.findIndex((l) => l.startsWith('  const Fld = ('));
  const expAt = lines.findIndex((l) => l.startsWith('export default function Checkout'));
  if (defAt < 0 || expAt < 0) { console.log('NOT FOUND: ' + rel); miss = true; continue; }
  lines.splice(defAt, 1);
  lines.splice(expAt, 0, ...NEW);
  const out = lines.map((l) => l.split('<Fld ').join('<Fld f={f} up={up} ')).join(eol);
  pending.push({ full, out, rel });
}
if (miss) { console.log('FAIL: nothing was written'); process.exit(1); }
for (const p of pending) { fs.writeFileSync(p.full, p.out, 'utf8'); console.log('Patched: ' + p.rel); }
console.log('PASS');
