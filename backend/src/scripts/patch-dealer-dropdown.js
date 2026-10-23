const fs = require('fs');
const path = require('path');
const root = path.resolve(process.cwd(), '..');
const files = [
  { p: path.join(root, 'backend', 'src', 'routes', 'groups.js'), edits: [
    { old: "import { partnerApplicationRoutes } from './partnerApplications.js';",
      add: "import { partnerApplicationRoutes } from './partnerApplications.js';\nimport { partnerDealerRoutes } from './partnerDealers.js';",
      done: "partnerDealerRoutes } from" },
    { old: "partnerRoutes.use('/applications', partnerApplicationRoutes);",
      add: "partnerRoutes.use('/applications', partnerApplicationRoutes);\npartnerRoutes.use('/dealers', partnerDealerRoutes);",
      done: "partnerRoutes.use('/dealers'" } ] },
  { p: path.join(root, 'apps', 'm3labs', 'src', 'JobDetail.jsx'), edits: [
    { old: "const [vendor, setVendor] = useState('');",
      add: "const [vendor, setVendor] = useState('');\n  const [dealers, setDealers] = useState([]);",
      done: "setDealers] = useState" },
    { old: "useEffect(() => { load(); }, [load]);",
      add: "useEffect(() => { load(); }, [load]);\n  useEffect(() => { api.get(P + '/dealers').then((x) => setDealers(x.dealers || [])).catch(() => {}); }, []);",
      done: "P + '/dealers'" },
    { old: "{mode === 'dealer' ? <input placeholder=\"Dealer code\" value={vendor} onChange={(e) => setVendor(e.target.value)} /> : null}",
      add: "{mode === 'dealer' ? (\n            <select value={vendor} onChange={(e) => setVendor(e.target.value)}>\n              <option value=\"\">Choose a dealer</option>\n              {dealers.map((d) => <option key={d.code} value={d.code}>{d.name} ({d.code}){d.speciality ? ' - ' + d.speciality : ''}</option>)}\n            </select>\n          ) : null}\n          {mode === 'dealer' && !dealers.length ? <p className=\"muted\">No active dealers yet.</p> : null}",
      done: "Choose a dealer" },
    { old: "'Assignment saved')}>Save</button>",
      add: "'Assignment saved')} disabled={mode === 'dealer' && !vendor}>Save</button>",
      done: "disabled={mode === 'dealer' && !vendor}" } ] },
];
const out = []; let miss = false; const writes = [];
for (const f of files) {
  if (!fs.existsSync(f.p)) { out.push('NOT FOUND file ' + f.p); miss = true; continue; }
  let t = fs.readFileSync(f.p, 'utf8');
  const crlf = t.includes('\r\n');
  t = t.replace(/\r\n/g, '\n');
  for (const e of f.edits) {
    if (t.includes(e.done)) { out.push('Already done: ' + e.done); continue; }
    if (!t.includes(e.old)) { out.push('NOT FOUND: ' + e.old.slice(0, 50)); miss = true; continue; }
    t = t.replace(e.old, () => e.add);
    out.push('Patched: ' + e.done);
  }
  writes.push({ p: f.p, t: crlf ? t.replace(/\n/g, '\r\n') : t });
}
out.forEach((l) => console.log(l));
if (miss) { console.log('Nothing written.'); process.exit(1); }
writes.forEach((w) => fs.writeFileSync(w.p, w.t));
console.log('PASS');
