const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const root = path.resolve(__dirname, '..', '..', '..');
const apply = process.argv.includes('--apply');
const OLD = 'prestige-m';
const NEW = 'gift-hub';
const files = cp.execSync('git ls-files -co --exclude-standard', { cwd: root, encoding: 'utf8', maxBuffer: 100000000 }).split(/\r?\n/).filter(Boolean);
const TEXT = /\.(js|jsx|cjs|mjs|json|md|html|css|yml|yaml|txt|toml|example)$/i;
let total = 0;
let nfiles = 0;
for (const f of files) {
  if (!TEXT.test(f)) continue;
  if (f.endsWith('rename-gift.cjs')) continue;
  const full = path.join(root, f);
  if (!fs.existsSync(full)) continue;
  const s = fs.readFileSync(full, 'utf8');
  const n = s.split(OLD).length - 1;
  if (n === 0) continue;
  total += n;
  nfiles += 1;
  console.log((apply ? 'edit  ' : 'would edit  ') + f + '  (' + n + ')');
  if (apply) fs.writeFileSync(full, s.split(OLD).join(NEW));
}
console.log('Total: ' + total + ' in ' + nfiles + ' files');
const from = path.join(root, 'apps', OLD);
const to = path.join(root, 'apps', NEW);
if (fs.existsSync(from) && !fs.existsSync(to)) {
  if (apply) {
    try { fs.renameSync(from, to); console.log('Folder renamed to apps/' + NEW); }
    catch (e) { console.log('FAIL folder rename: ' + e.message + ' (close dev servers and VS Code, then run again)'); process.exit(1); }
  } else {
    console.log('would rename folder apps/' + OLD + ' to apps/' + NEW);
  }
} else {
  console.log('Folder: nothing to rename');
}
console.log(apply ? 'DONE. Now run npm install.' : 'DRY RUN only. Nothing changed.');
