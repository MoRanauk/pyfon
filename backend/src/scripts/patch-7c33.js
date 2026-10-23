import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const pending = [];
let failed = false;
const rep = (find, put) => (t) => (t.includes(find) ? t.replace(find, () => put) : null);

function edit(rel, steps) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) { console.log('NOT FOUND (file): ' + rel); failed = true; return; }
  const raw = fs.readFileSync(p, 'utf8');
  const crlf = raw.includes('\r\n');
  let t = raw.replace(/\r\n/g, '\n');
  let changed = false;
  for (const s of steps) {
    if (t.includes(s.done)) { console.log('Already done: ' + rel + ' [' + s.name + ']'); continue; }
    const out = s.apply(t);
    if (out === null) { console.log('NOT FOUND: ' + rel + ' [' + s.name + ']'); failed = true; return; }
    t = out;
    changed = true;
    console.log('Patched: ' + rel + ' [' + s.name + ']');
  }
  if (changed) pending.push({ p, text: crlf ? t.replace(/\n/g, '\r\n') : t });
}

edit('backend/src/routes/groups.js', [
  { name: 'import', done: "from './partnerApplications.js'",
    apply: rep("import { partnerCouponRoutes } from './partnerCoupons.js';\n",
      "import { partnerCouponRoutes } from './partnerCoupons.js';\nimport { partnerApplicationRoutes } from './partnerApplications.js';\n") },
  { name: 'mount', done: "'/applications'",
    apply: rep("partnerRoutes.use('/coupons', partnerCouponRoutes);\n",
      "partnerRoutes.use('/coupons', partnerCouponRoutes);\npartnerRoutes.use('/applications', partnerApplicationRoutes);\n") },
]);

edit('backend/src/app.js', [
  { name: 'dealer invite', done: 'publicDealerInvite',
    apply: (t) => {
      const useApply = t.includes('publicApply.js');
      const key = useApply ? 'publicApply' : 'publicPasswordHelp';
      const route = useApply ? '/v1/apply' : '/v1/password-help';
      const imp = t.match(new RegExp('^import[^\\n]*' + key + '[^\\n]*$', 'm'));
      const use = t.match(new RegExp('^[^\\n]*' + route.replace(/\//g, '\\/') + '[^\\n]*$', 'm'));
      if (!imp || !use) return null;
      const base = imp[0].match(new RegExp("from\\s+'([^']*)" + key + "\\.js'"));
      const tgt = use[0].match(/^(\s*)(\w+)\.use\(/);
      if (!base || !tgt || !/;\s*$/.test(use[0])) return null;
      let out = t.replace(imp[0], () => imp[0] + "\nimport publicDealerInvite from '" + base[1] + "publicDealerInvite.js';");
      out = out.replace(use[0], () => use[0] + '\n' + tgt[1] + tgt[2] + ".use('/v1/dealer-invite', publicDealerInvite);");
      return out;
    } },
]);

edit('apps/m3labs/src/App.jsx', [
  { name: 'import', done: "from './Applications.jsx'",
    apply: rep("import Coupons from './Coupons.jsx';\n", "import Coupons from './Coupons.jsx';\nimport Applications from './Applications.jsx';\n") },
  { name: 'route', done: 'path="/applications"',
    apply: rep('<Route path="/coupons" element={<Coupons />} />\n',
      '<Route path="/coupons" element={<Coupons />} />\n        <Route path="/applications" element={<Applications />} />\n') },
]);

edit('apps/m3labs/src/partnerNav.js', [
  { name: 'menu', done: "'/applications'",
    apply: rep("['/tickets', 'Tickets', true],", "['/tickets', 'Tickets', true], ['/applications', 'Applications', true],") },
]);

edit('apps/dealer/src/App.jsx', [
  { name: 'import', done: "from './Join.jsx'",
    apply: rep("import { api, tokens } from './api.js';\n", "import { api, tokens } from './api.js';\nimport Join from './Join.jsx';\n") },
  { name: 'join page', done: "pathname === '/join'",
    apply: rep("  function out() { tokens.clear(); setUser(null); }\n",
      "  function out() { tokens.clear(); setUser(null); }\n  if (window.location.pathname === '/join') return <Join />;\n") },
]);

if (failed) { console.log('FAIL: nothing was written'); process.exit(1); }
for (const w of pending) fs.writeFileSync(w.p, w.text);
console.log('PASS: ' + pending.length + ' file(s) written');
