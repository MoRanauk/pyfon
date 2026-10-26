const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const P = (p) => path.join(root, p);

function setIcon(app, href, type) {
  const p = 'apps/' + app + '/index.html';
  let s = fs.readFileSync(P(p), 'utf8');
  const crlf = s.includes('\r\n');
  s = s.replace(/\r\n/g, '\n');
  if (!s.includes('</head>')) { console.log('FAIL no </head> in ' + p); process.exit(1); }
  s = s.replace(/[ \t]*<link[^>]*rel=["']icon["'][^>]*>\n?/g, '');
  s = s.replace('</head>', (m) => '  <link rel="icon" type="' + type + '" href="' + href + '" />\n' + m);
  if (crlf) s = s.replace(/\n/g, '\r\n');
  fs.writeFileSync(P(p), s);
  console.log('icon set: ' + p + ' -> ' + href);
}

// 1. TriM icon (write the file if it is missing)
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#111111"/><rect x="3" y="3" width="58" height="58" rx="10" fill="none" stroke="#c9a14a" stroke-width="2"/><text x="32" y="43" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="#c9a14a">T<tspan font-style="italic">M</tspan></text></svg>\n';
fs.mkdirSync(P('apps/trim-atelier/public'), { recursive: true });
if (!fs.existsSync(P('apps/trim-atelier/public/favicon.svg'))) fs.writeFileSync(P('apps/trim-atelier/public/favicon.svg'), svg);
setIcon('trim-atelier', '/favicon.svg', 'image/svg+xml');

// 2. Gift Hub icon = the invoice logo
const logo = P('apps/m3labs/public/pyfon-logo.png');
if (!fs.existsSync(logo)) { console.log('FAIL logo not found'); process.exit(1); }
fs.copyFileSync(logo, P('apps/gift-hub/public/favicon.png'));
const b = fs.readFileSync(logo);
const w = b.readUInt32BE(16);
const h = b.readUInt32BE(20);
console.log('logo size: ' + w + ' x ' + h + ' px, ' + Math.round(b.length / 1024) + ' KB');
if (Math.max(w, h) / Math.min(w, h) > 1.3) console.log('NOTE: logo is not square; tell me and I will make a square icon');
setIcon('gift-hub', '/favicon.png', 'image/png');

// 3. TriM home page
const hf = P('apps/trim-atelier/src/Home.jsx');
let h1 = fs.readFileSync(hf, 'utf8');
const hc = h1.includes('\r\n');
h1 = h1.replace(/\r\n/g, '\n');
if (h1.includes('TrimName')) { console.log('Home.jsx: already done'); }
else {
  const a = '<h2>The TriM difference</h2>';
  const c = '<span className="th-eye">{SITE.heroEye}</span>';
  const d = "import { useSiteImages } from './siteImages.js';\n";
  if (!h1.includes(a) || !h1.includes(c) || !h1.includes(d)) { console.log('Home.jsx NOT FOUND (a line changed)'); process.exit(1); }
  h1 = h1.replace(a, () => '<h2>The <TrimName text="TriM" /> difference</h2>');
  h1 = h1.replace(c, () => '<span className="th-eye"><TrimName text={SITE.heroEye} /></span>');
  h1 = h1.replace(d, () => d + "import { TrimName } from './TrimName.jsx';\n");
  if (hc) h1 = h1.replace(/\n/g, '\r\n');
  fs.writeFileSync(hf, h1);
  console.log('Home.jsx: patched');
}

// 4. TriM header and footer (best effort)
const lf = P('apps/trim-atelier/src/Layout.jsx');
let l = fs.readFileSync(lf, 'utf8');
const lc = l.includes('\r\n');
l = l.replace(/\r\n/g, '\n');
if (l.includes('TrimName')) { console.log('Layout.jsx: already done'); }
else {
  const re = /(?<=[>\s])\{(?:SITE|S)\.name\}/g;
  const n = (l.match(re) || []).length;
  if (n === 0) { console.log('Layout.jsx: NO {SITE.name} found. Send me: git grep -n "name" apps/trim-atelier/src/Layout.jsx'); }
  else {
    l = l.replace(re, () => '<TrimName />');
    const imps = l.match(/^import [^\n]*;\n/gm);
    const last = imps[imps.length - 1];
    const idx = l.lastIndexOf(last) + last.length;
    l = l.slice(0, idx) + "import { TrimName } from './TrimName.jsx';\n" + l.slice(idx);
    if (lc) l = l.replace(/\n/g, '\r\n');
    fs.writeFileSync(lf, l);
    console.log('Layout.jsx: patched ' + n + ' place(s)');
  }
}
