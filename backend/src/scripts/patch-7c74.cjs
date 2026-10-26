const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const errors = [];
const writes = [];

function edit(file, pairs) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) { errors.push('MISSING FILE ' + file); return; }
  const raw = fs.readFileSync(p, 'utf8');
  const crlf = raw.includes('\r\n');
  let t = raw.replace(/\r\n/g, '\n');
  let changed = 0;
  for (const [o, n] of pairs) {
    if (t.includes(n)) continue;
    const c = t.split(o).length - 1;
    if (c !== 1) { errors.push('NOT FOUND (' + c + ') in ' + file + ': ' + o.slice(0, 70)); continue; }
    t = t.split(o).join(n);
    changed++;
  }
  writes.push({ p, text: crlf ? t.replace(/\n/g, '\r\n') : t, label: file + (changed ? ' (patched ' + changed + ')' : ' (already done)') });
}

edit('packages/ui/src/Motion.jsx', [
  [`export function Slider({ slides, interval = 9500, height = 'clamp(360px, 50vw, 540px)' }) {`,
   `export function Slider({ slides, interval = 9500, height = 'clamp(360px, 50vw, 540px)', contain = false }) {`],
  [`style={{ position: 'relative', overflow: 'hidden', height, background: 'var(--pf-navy)' }}`,
   `className={'pf-sl' + (contain ? ' pf-sl-contain' : '')} style={{ position: 'relative', overflow: 'hidden', height, background: 'var(--pf-navy)' }}`],
  [`src={s.image}`, `className="pf-sl-img" src={s.image}`],
  [`<div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg`,
   `<div className="pf-sl-shade" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg`],
]);

edit('apps/mco-brands/src/Home.jsx', [
  [`<Slider slides={slides} />`, `<Slider slides={slides} contain />`],
]);

const cssFile = 'apps/mco-brands/src/styles.css';
const cp = path.join(root, cssFile);
if (!fs.existsSync(cp)) { errors.push('MISSING FILE ' + cssFile); }
else {
  const raw = fs.readFileSync(cp, 'utf8');
  if (raw.includes('/* 7c74 hero')) { console.log('Already done ' + cssFile); }
  else {
    const add = `
/* 7c74 hero: whole product on desktop, phone unchanged */
@media(min-width:901px){
.pf-sl-contain .pf-sl-img{left:auto!important;right:0!important;width:54%!important;object-fit:contain!important;animation:none!important;background:#f3eee4;box-sizing:border-box;padding:18px}
.pf-sl-contain .pf-sl-shade{display:none}
.pf-sl-contain .hs{max-width:44%}
}
`;
    writes.push({ p: cp, text: raw + (raw.includes('\r\n') ? add.replace(/\n/g, '\r\n') : add), label: cssFile + ' (css added)' });
  }
}

if (errors.length) { errors.forEach((e) => console.log(e)); console.log('FAIL: nothing written'); process.exit(1); }
for (const w of writes) { fs.writeFileSync(w.p, w.text, 'utf8'); console.log('Patched ' + w.label); }
console.log('PASS: 7c74 hero patched');
