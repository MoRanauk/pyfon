const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const out = [];
let bad = false;
const rep = (s, a, b) => (s.includes(a) ? s.replace(a, () => b) : null);

function job(file, fn) {
  const raw = fs.readFileSync(path.join(root, file), 'utf8');
  const crlf = raw.includes('\r\n');
  const s = raw.replace(/\r\n/g, '\n');
  const r = fn(s);
  if (r === null) { console.log(file + ': NOT FOUND'); bad = true; return; }
  if (r === s) { console.log(file + ': already done'); return; }
  out.push([file, crlf ? r.replace(/\n/g, '\r\n') : r]);
}

job('backend/src/routes/groups.js', (s) => {
  if (s.includes('partnerSocialRoutes')) return s;
  let t = rep(s, "import { partnerContentRoutes } from './siteContent.js';", "import { partnerContentRoutes } from './siteContent.js';\nimport { partnerSocialRoutes } from './partnerSocial.js';");
  if (t === null) return null;
  t = rep(t, "partnerRoutes.use('/dealers', partnerDealerRoutes);", "partnerRoutes.use('/dealers', partnerDealerRoutes);\npartnerRoutes.use('/social', partnerSocialRoutes);");
  if (t === null) return null;
  return rep(t, "devRoutes.use('/content', partnerContentRoutes);", "devRoutes.use('/content', partnerContentRoutes);\ndevRoutes.use('/social', partnerSocialRoutes);");
});

job('backend/src/app.js', (s) => {
  if (s.includes('publicSocialRoutes')) return s;
  const m = s.match(/^[ \t]*app\.use\(\s*['"]\/v1\/content['"][^\n]*\n/m);
  const imports = [...s.matchAll(/^import .*;$/gm)];
  if (!m || !imports.length) return null;
  const last = imports[imports.length - 1];
  if (last.index > m.index) return null;
  const cut = m.index + m[0].length;
  let t = s.slice(0, cut) + "app.use('/v1/social', publicSocialRoutes);\n" + s.slice(cut);
  const at = last.index + last[0].length;
  t = t.slice(0, at) + "\nimport { publicSocialRoutes } from './routes/publicSocial.js';" + t.slice(at);
  return t;
});

job('apps/gift-hub/src/Layout.jsx', (s) => {
  if (s.includes('SocialLinks')) return s;
  const t = rep(s, "import { Footer } from '@pyfon/ui';", "import { Footer } from '@pyfon/ui';\nimport SocialLinks from './SocialLinks.jsx';");
  const re = /(<Link to="\/track">Track my order<\/Link>\s*<\/div>)/;
  if (t === null || !re.test(t)) return null;
  return t.replace(re, (m) => m + '\n            <div><h4>Social</h4><SocialLinks store="prestige" layout="list" size={22} gap={12} /></div>');
});

job('apps/trim-atelier/src/Layout.jsx', (s) => {
  if (s.includes('SocialLinks')) return s;
  const t = rep(s, "import { Footer } from '@pyfon/ui';", "import { Footer } from '@pyfon/ui';\nimport SocialLinks from './SocialLinks.jsx';");
  const re = /(Corporate gifting<\/a>\s*<\/div>)/;
  if (t === null || !re.test(t)) return null;
  return t.replace(re, (m) => m + '\n        <div><h4>Social</h4><SocialLinks store="trim" layout="list" size={22} gap={12} /></div>');
});

job('apps/mco-brands/src/Header.jsx', (s) => {
  if (s.includes('SocialLinks')) return s;
  const t = rep(s, "import { useSearchHint } from './SearchHint.jsx';", "import { useSearchHint } from './SearchHint.jsx';\nimport SocialLinks from './SocialLinks.jsx';\nimport './soc.css';");
  if (t === null) return null;
  return rep(t, `return <div className="announce"><span key={i} className="ann">{MESSAGES[i]}</span></div>;`, `return (
    <div className="announce" style={{ position: 'relative' }}>
      <span key={i} className="ann">{MESSAGES[i]}</span>
      <span className="ann-soc"><SocialLinks store="mco" size={18} gap={12} /></span>
    </div>
  );`);
});

if (bad) { console.log('Nothing written.'); process.exit(1); }
for (const [file, text] of out) { fs.writeFileSync(path.join(root, file), text); console.log(file + ': Patched'); }
