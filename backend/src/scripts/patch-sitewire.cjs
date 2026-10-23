const fs = require('fs');
const path = require('path');
const root = path.resolve(process.cwd(), '..');
const jobs = [
  { p: 'apps/trim-atelier/src/Layout.jsx', edits: [
    { done: "from './siteContent.js'", old: "import './tzhome.css';", add: "import './tzhome.css';\nimport { useSiteContent, themeStyle } from './siteContent.js';" },
    { done: "useSiteContent('trim')", old: "const loc = useLocation();", add: "const loc = useLocation();\n  const content = useSiteContent('trim');\n  const wrapStyle = themeStyle('trim', content.theme);" },
    { done: 'className="mood-root"', re: /return \(\s*<div>/, add: 'return (\n    <div className="mood-root" style={wrapStyle}>' },
    { done: 'content.announce[0]', old: '{SITE.announce}<button', add: '{content.announce && content.announce.length ? content.announce[0] : SITE.announce}<button' } ] },
  { p: 'apps/mco-brands/src/Layout.jsx', edits: [
    { done: "from './siteContent.js'", old: "import { FloatPair } from './FloatPair.jsx';", add: "import { FloatPair } from './FloatPair.jsx';\nimport { useSiteContent, themeStyle } from './siteContent.js';" },
    { done: "useSiteContent('mco')", old: "const { user } = useAuth();", add: "const { user } = useAuth();\n  const content = useSiteContent('mco');\n  const wrapStyle = themeStyle('mco', content.theme);" },
    { done: 'className="mood-root"', old: '<SearchHintProvider>', add: '<SearchHintProvider>\n    <div className="mood-root" style={wrapStyle}>' },
    { done: '</div>\n    </SearchHintProvider>', old: '</SearchHintProvider>', add: '</div>\n    </SearchHintProvider>' } ] },
];
const out = []; const writes = []; let miss = false;
for (const j of jobs) {
  const fp = path.join(root, j.p);
  if (!fs.existsSync(fp)) { out.push('NOT FOUND file ' + j.p); miss = true; continue; }
  let t = fs.readFileSync(fp, 'utf8');
  const crlf = t.includes('\r\n');
  t = t.replace(/\r\n/g, '\n');
  for (const e of j.edits) {
    if (t.includes(e.done)) { out.push('Already done: ' + e.done); continue; }
    if (e.re) {
      if (!e.re.test(t)) { out.push('NOT FOUND: ' + String(e.re)); miss = true; continue; }
      t = t.replace(e.re, () => e.add);
    } else {
      if (!t.includes(e.old)) { out.push('NOT FOUND: ' + e.old.slice(0, 60)); miss = true; continue; }
      t = t.replace(e.old, () => e.add);
    }
    out.push('Patched: ' + e.done);
  }
  writes.push({ fp, t: crlf ? t.replace(/\n/g, '\r\n') : t });
}
out.forEach((l) => console.log(l));
if (miss) { console.log('Nothing written.'); process.exit(1); }
writes.forEach((w) => fs.writeFileSync(w.fp, w.t));
console.log('PASS');
