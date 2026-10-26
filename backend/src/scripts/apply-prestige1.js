import fs from 'fs';
import path from 'path';
const app = '../apps/gift-hub';
const swaps = [["'mco'", "'prestige'"], ['"mco"', '"prestige"'], ['M & Co. Brands', 'Prestige M'], ['M &amp; Co. Brands', 'Prestige M']];
function walk(d, out) {
  for (const it of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, it.name);
    if (it.isDirectory()) walk(f, out); else if (/\.(js|jsx)$/.test(it.name)) out.push(f);
  }
  return out;
}
let changed = 0;
const left = [];
for (const f of walk(app + '/src', [])) {
  let t = fs.readFileSync(f, 'utf8');
  const o = t;
  for (const [a, b] of swaps) t = t.split(a).join(b);
  if (t !== o) { fs.writeFileSync(f, t); changed++; }
  t.split('\n').forEach((l, i) => { if (/mco|Co\. Brand/i.test(l) && !/to="\/co-brand"/.test(l)) left.push(path.basename(f) + ':' + (i + 1) + ': ' + l.trim().slice(0, 110)); });
}
console.log('Renamed in ' + changed + ' files');
const one = [
  [app + '/package.json', '@pyfon/mco-brands', '@pyfon/gift-hub'],
  [app + '/vite.config.js', 'port: 5173', 'port: 5175'],
  [app + '/index.html', 'M &amp; Co. Brands', 'Prestige M'],
  [app + '/src/main.jsx', "applyTheme('mco')", "applyTheme('prestige')"],
  [app + '/src/main.jsx', "import './styles.css';", "import './styles.css';\nimport './prestige.css';"],
  [app + '/src/App.jsx', '<><Home /><FloatingVideo /></>', '<Home />'],
  [app + '/src/Layout.jsx', "lift={loc.pathname === '/' ? 130 : 0}", 'lift={0}'],
];
let bad = false;
for (const [file, find, rep] of one) {
  const t = fs.readFileSync(file, 'utf8');
  if (t.includes(rep)) { console.log('Already done: ' + path.basename(file) + ' ' + rep.slice(0, 30)); continue; }
  if (!t.includes(find)) { console.log('NOT FOUND in ' + file + ': ' + find); bad = true; continue; }
  fs.writeFileSync(file, t.replace(find, () => rep));
  console.log('Patched: ' + path.basename(file) + ' ' + find.slice(0, 30));
}
console.log('--- lines still mentioning mco or Co. Brand (check these) ---');
left.slice(0, 40).forEach((l) => console.log(l));
process.exit(bad ? 1 : 0);
