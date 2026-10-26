const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const out = {};
const log = [];
let bad = false;
const UI = "import { ReviewsSection } from '@pyfon/ui';";

function load(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) { log.push('MISSING ' + rel); bad = true; return null; }
  const raw = fs.readFileSync(full, 'utf8');
  return { rel, full, crlf: raw.includes('\r\n'), s: raw.replace(/\r\n/g, '\n') };
}
function miss(rel, what) { log.push('NOT FOUND in ' + rel + ': ' + what); bad = true; }
function done(f) { out[f.rel] = f; log.push('ok ' + f.rel); }
function addImport(f, line) {
  const re = /^import [^\n]*react-router-dom';\n/m;
  if (!re.test(f.s)) { miss(f.rel, 'react-router-dom import line'); return false; }
  f.s = f.s.replace(re, (m) => m + line + '\n');
  return true;
}
const SECTION = (extra, title) => '<ReviewsSection store={STORE} ' + extra + 'apiUrl={API_URL} getToken={() => tokens.get()} loginHref="/account" ' + title + 'accent="#c9a14a" />';

// Gift Hub home
let f = load('apps/gift-hub/src/Home.jsx');
if (f) {
  if (f.s.includes('ReviewsSection')) log.push('already ' + f.rel);
  else {
    const re = /\{SITE\.quote \? \(\s*<section className="hm-rev">[\s\S]*?<\/section>\s*\) : null\}/;
    if (!re.test(f.s)) miss(f.rel, 'hm-rev block');
    else {
      f.s = f.s.replace(re, () => '<section className="hm-rev">' + SECTION('', 'title={H.reviewTitle} ') + '</section>');
      if (addImport(f, UI + "\nimport { STORE, API_URL, tokens } from './api.js';")) done(f);
    }
  }
}
// TriM home
f = load('apps/trim-atelier/src/Home.jsx');
if (f) {
  if (f.s.includes('ReviewsSection')) log.push('already ' + f.rel);
  else {
    const re = /<div className="t-rev">\{SITE\.reviews\.map\([\s\S]*?\)\)\}<\/div>/;
    if (!re.test(f.s)) miss(f.rel, 't-rev block');
    else {
      f.s = f.s.replace(re, () => SECTION('', ''));
      if (addImport(f, UI + "\nimport { STORE, API_URL, tokens } from './api.js';")) done(f);
    }
  }
}
// Product pages (gift and TriM)
const OLDQ = '{SITE.quote ? <div className="jx-quote">&ldquo;<br />{SITE.quote}{SITE.showSample ? <div style={{ fontSize: 13, opacity: 0.6 }}>(sample)</div> : null}</div> : null}';
for (const rel of ['apps/gift-hub/src/Product.jsx', 'apps/trim-atelier/src/Product.jsx']) {
  f = load(rel);
  if (!f) continue;
  if (f.s.includes('ReviewsSection')) { log.push('already ' + rel); continue; }
  if (!f.s.includes(OLDQ)) { miss(rel, 'jx-quote line'); continue; }
  f.s = f.s.replace(OLDQ, () => "<div style={{ maxWidth: 1100, margin: '40px auto', padding: '0 16px' }}>" + SECTION('sku={item.sku} ', 'title="Customer reviews" ') + '</div>');
  if (addImport(f, UI + "\nimport { API_URL, tokens } from './api.js';")) done(f);
}
// Remove sample reviews from the site files
f = load('apps/gift-hub/src/site.js');
if (f) {
  f.s = f.s.replace(/^(\s*)quote: '[^']*',/m, (m, a) => a + "quote: '',");
  f.s = f.s.replace(/^(\s*)quoteBy: '[^']*',/m, (m, a) => a + "quoteBy: '',");
  f.s = f.s.replace(/showSample: true,/, 'showSample: false,');
  done(f);
}
f = load('apps/trim-atelier/src/site.js');
if (f) {
  const re = /reviews: \[[\s\S]*?\n  \],/;
  if (!re.test(f.s)) miss(f.rel, 'reviews array');
  else {
    f.s = f.s.replace(re, () => 'reviews: [],');
    f.s = f.s.replace(/showSample: true,/, 'showSample: false,');
    done(f);
  }
}
// M3 Labs: route, import, menus
f = load('apps/m3labs/src/App.jsx');
if (f) {
  if (/\/reviews['"]/.test(f.s)) log.push('already ' + f.rel);
  else {
    const lines = f.s.split('\n');
    const ri = lines.findIndex((l) => l.includes('<Route') && l.includes('/site-images'));
    const ii = lines.findIndex((l) => l.includes('SiteImages') && !l.includes('<Route'));
    if (ri < 0 || ii < 0) miss(f.rel, 'site-images route or SiteImages import');
    else {
      const route = lines[ri].replace(/site-images/g, 'reviews').replace(/SiteImages/g, 'Reviews');
      const imp = lines[ii].replace(/SiteImages/g, 'Reviews');
      lines.splice(ri + 1, 0, route);
      lines.splice(ii + 1, 0, imp);
      f.s = lines.join('\n');
      done(f);
    }
  }
}
const NAV = /\[\s*'\/site-images'\s*,\s*'[^']*'\s*,\s*([^\]]*?)\s*\]/;
for (const rel of ['apps/m3labs/src/partnerNav.js', 'apps/m3labs/src/devNav.js']) {
  f = load(rel);
  if (!f) continue;
  if (f.s.includes("'/reviews'")) { log.push('already ' + rel); continue; }
  if (!NAV.test(f.s)) { miss(rel, "'/site-images' menu entry"); continue; }
  f.s = f.s.replace(NAV, (m, third) => m + ", ['/reviews', 'Reviews', " + third + ']');
  done(f);
}
console.log(log.join('\n'));
if (bad) { console.log('FAIL: nothing was written. Paste this output in the chat.'); process.exit(1); }
for (const k of Object.keys(out)) {
  const o = out[k];
  fs.writeFileSync(o.full, o.crlf ? o.s.replace(/\n/g, '\r\n') : o.s);
}
console.log('PASS: ' + Object.keys(out).length + ' files written');
