const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
function load(rel) {
  const full = path.join(root, rel);
  const raw = fs.readFileSync(full, 'utf8');
  return { rel, full, crlf: raw.includes('\r\n'), s: raw.replace(/\r\n/g, '\n') };
}
const SEC = (extra, title) => '<ReviewsSection store={STORE} ' + extra + 'apiUrl={API_URL} getToken={() => tokens.get()} loginHref="/account" ' + title + 'accent="#c9a14a" />';
const out = [];
const log = [];
let bad = false;

const h = load('apps/mco-brands/src/Home.jsx');
if (h.s.includes('ReviewsSection')) log.push('already Home.jsx');
else {
  const imp1 = "import { Reveal, Slider } from '@pyfon/ui';";
  const imp2 = "import { api, STORE, img } from './api.js';";
  const re = /(\n[ \t]*)<section className="section">([ \t\n]*<div className="wrap">[ \t\n]*<Reveal>[ \t\n]*<div className="banner">)/;
  if (!h.s.includes(imp1) || !h.s.includes(imp2) || !re.test(h.s)) { log.push('NOT FOUND in Home.jsx'); bad = true; }
  else {
    h.s = h.s.replace(imp1, () => "import { Reveal, Slider, ReviewsSection } from '@pyfon/ui';");
    h.s = h.s.replace(imp2, () => "import { api, STORE, img, API_URL, tokens } from './api.js';");
    h.s = h.s.replace(re, (m, ind, rest) => ind + '<section className="section"><div className="wrap">' + SEC('', 'title="What customers say" ') + '</div></section>\n' + ind + '<section className="section">' + rest);
    out.push(h); log.push('ok Home.jsx');
  }
}
const p = load('apps/mco-brands/src/Product.jsx');
if (p.s.includes('ReviewsSection')) log.push('already Product.jsx');
else {
  const imp = "import { api, img, STORE } from './api.js';";
  const anchor = '{more.length ? (';
  if (!p.s.includes(imp) || p.s.split(anchor).length !== 2) { log.push('NOT FOUND in Product.jsx'); bad = true; }
  else {
    p.s = p.s.replace(imp, () => imp.replace('STORE }', 'STORE, API_URL, tokens }') + "\nimport { ReviewsSection } from '@pyfon/ui';");
    p.s = p.s.replace(anchor, () => '<div style={{ marginTop: 40 }}>' + SEC('sku={item.sku} ', 'title="Customer reviews" ') + '</div>\n\n      ' + anchor);
    out.push(p); log.push('ok Product.jsx');
  }
}
console.log(log.join('\n'));
if (bad) { console.log('FAIL: nothing was written. Paste this output in the chat.'); process.exit(1); }
for (const o of out) fs.writeFileSync(o.full, o.crlf ? o.s.replace(/\n/g, '\r\n') : o.s);
console.log('PASS: ' + out.length + ' files written');
