import fs from 'node:fs';
const dir = '../apps/m3labs/src/';
let miss = false;
const test = (t, x) => (x instanceof RegExp ? x.test(t) : t.includes(x));
function edit(file, steps) {
  let t = fs.readFileSync(dir + file, 'utf8');
  let changed = false;
  for (const [label, find, repl, done] of steps) {
    if (test(t, done)) { console.log('Already done: ' + label); continue; }
    if (test(t, find)) {
      t = find instanceof RegExp ? t.replace(find, () => repl) : t.split(find).join(repl);
      changed = true; console.log('Patched: ' + label);
    } else { console.log('NOT FOUND: ' + label); miss = true; }
  }
  if (changed && !miss) fs.writeFileSync(dir + file, t);
}
edit('Money.jsx', [
  ['one row', /<\/div>\r?\n\s*<div className="bar">\r?\n\s*<input placeholder="Search entries"/, '<input placeholder="Search entries"', /<\/button>\)\}\r?\n\s*<input placeholder="Search entries"/],
  ['rename bar', 'className="bar"', 'className="mbar"', 'className="mbar"'],
]);
edit('MoneyTables.jsx', [
  ['css bar', '.mb .bar{', '.mb .mbar{', '.mb .mbar{'],
  ['css note', '.mb .note{', '.mb .mnote{', '.mb .mnote{'],
  ['note class', 'className="note"', 'className="mnote"', 'className="mnote"'],
]);
process.exit(miss ? 1 : 0);
