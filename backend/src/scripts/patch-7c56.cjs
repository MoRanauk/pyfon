const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
let failed = false;

function patch(rel, marker, steps) {
  const file = path.join(root, rel);
  let src = fs.readFileSync(file, 'utf8');
  const crlf = src.includes('\r\n');
  src = src.replace(/\r\n/g, '\n');
  if (src.includes(marker)) { console.log(rel + ': already done'); return; }
  for (const [a] of steps) {
    if (!src.includes(a)) { console.log(rel + ': NOT FOUND: ' + a.slice(0, 60)); failed = true; return; }
  }
  for (const [a, b] of steps) src = src.replace(a, () => b);
  if (crlf) src = src.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, src);
  console.log(rel + ': patched');
}

patch('apps/m3labs/src/App.jsx', 'LoginGallery', [
  [`import ThemeManager from './ThemeManager.jsx';`, `import ThemeManager from './ThemeManager.jsx';\nimport LoginGallery from './LoginGallery.jsx';\nimport SiteImages from './SiteImages.jsx';`],
  [`        <Route path="/theme" element={<ThemeManager />} />`, `        <Route path="/theme" element={<ThemeManager />} />\n        <Route path="/login-gallery" element={<LoginGallery />} />\n        <Route path="/site-images" element={<SiteImages />} />`],
]);
patch('apps/m3labs/src/devNav.js', '/login-gallery', [
  [`['/theme', 'Theme manager', true],`, `['/theme', 'Theme manager', true], ['/login-gallery', 'Login gallery', true], ['/site-images', 'Shop photos', true],`],
]);
patch('apps/m3labs/src/partnerNav.js', '/site-images', [
  [`['/coupons', 'Coupons', true],`, `['/coupons', 'Coupons', true], ['/site-images', 'Shop photos', true],`],
]);
patch('apps/m3labs/src/Login.jsx', 'LoginArt', [
  [`import { ls } from './store.js';`, `import { ls } from './store.js';\nimport LoginArt from './LoginArt.jsx';`],
  [`      <div className="split-art" style={img ? { backgroundImage: 'linear-gradient(rgba(11,42,74,.25),rgba(11,42,74,.25)), url("' + img + '")' } : undefined}>\n        <blockquote>{quote}</blockquote>\n      </div>`, `      <LoginArt quote={quote} fallbackImg={img} />`],
]);
patch('apps/gift-hub/src/Home.jsx', 'useSiteImages', [
  [`import { GiftCard } from './Sub.jsx';`, `import { GiftCard } from './Sub.jsx';\nimport { useSiteImages } from './siteImages.js';`],
  [`  const { mood } = useOutletContext();\n`, `  const { mood } = useOutletContext();\n  const IM = useSiteImages('prestige');\n`],
  [`{mo.hero ? <img src={mo.hero} alt="" /> : <div className="hm-ph" />}`, `{(IM['hero-' + (mood === 'him' ? 'him' : 'her')] || mo.hero) ? <img src={IM['hero-' + (mood === 'him' ? 'him' : 'her')] || mo.hero} alt="" /> : <div className="hm-ph" />}`],
  [`{H.feature.img ? <img src={H.feature.img} alt="" /> : null}`, `{(IM.feature || H.feature.img) ? <img src={IM.feature || H.feature.img} alt="" /> : null}`],
]);
patch('apps/trim-atelier/src/Home.jsx', 'useSiteImages', [
  [`import { SwipeLink } from './Swipe.jsx';`, `import { SwipeLink } from './Swipe.jsx';\nimport { useSiteImages } from './siteImages.js';`],
  [`  const [k, setK] = useState(0);\n`, `  const [k, setK] = useState(0);\n  const IM = useSiteImages('trim');\n`],
  [`style={{ background: s.img ? 'url(' + s.img + ') center/cover' : s.bg }}`, `style={{ background: (IM['slide-' + (i + 1)] || s.img) ? 'url("' + (IM['slide-' + (i + 1)] || s.img) + '") center/cover' : s.bg }}`],
  [`<div className="l" />`, `<div className="l" style={IM.diff ? { background: 'url("' + IM.diff + '") center/cover' } : undefined} />`],
]);
process.exit(failed ? 1 : 0);
