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

// 1. api-client: tell the shop when a password change is required
edit('packages/api-client/index.js', [
  { name: 'error event', done: "e.code === 'password_change_required'",
    apply: rep("      const e = (data && data.error) || {};\n",
      "      const e = (data && data.error) || {};\n      if (e.code === 'password_change_required' && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pyfon:must-change'));\n") },
  { name: 'login event', done: "path === '/v1/auth/login'",
    apply: rep("    return data;\n  }\n\n  const get",
      "    if (path === '/v1/auth/login' && data && data.mustChangePassword && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pyfon:must-change'));\n    return data;\n  }\n\n  const get") },
]);

// 2. ui: export the gate
edit('packages/ui/src/index.jsx', [
  { name: 'export gate', done: 'MustChangeGate',
    apply: rep("export { ResetByCode } from './ResetByCode.jsx';\n",
      "export { ResetByCode } from './ResetByCode.jsx';\nexport { MustChangeGate } from './MustChangeGate.jsx';\n") },
]);

// 3. ResetByCode: optional "Ask the team" button
edit('packages/ui/src/ResetByCode.jsx', [
  { name: 'prop', done: 'helpShop }) {',
    apply: rep('export function ResetByCode({ client, fixedEmail, onDone }) {',
      'export function ResetByCode({ client, fixedEmail, onDone, helpShop }) {') },
  { name: 'state and function', done: "const [asked",
    apply: rep("  const [busy, setBusy] = useState(false);\n",
`  const [busy, setBusy] = useState(false);
  const [asked, setAsked] = useState('');

  async function askTeam() {
    setErr('');
    setAsked('');
    if (!email.trim()) return setErr('Enter your account email first.');
    setBusy(true);
    try {
      await client.post('/v1/password-help', { email: email.trim(), shop: helpShop });
      setAsked('Thank you. If that email belongs to an account, the team has been told and will email you a temporary password.');
    } catch (x) {
      setErr(x.message || 'Could not send your request');
    } finally {
      setBusy(false);
    }
  }
`) },
  { name: 'button', done: 'Ask the team to reset my password',
    apply: rep("'Send code'}</button>\n      </form>",
`'Send code'}</button>
        {helpShop ? (
          <p style={{ marginTop: '12px' }}>
            <button type="button" disabled={busy} onClick={askTeam} style={link}>Ask the team to reset my password</button>
          </p>
        ) : null}
        {asked ? <p role="status">{asked}</p> : null}
      </form>`) },
]);

// 4. mco: pass helpShop to ResetByCode (file not seen, safe search)
edit('apps/mco-brands/src/Account.jsx', [
  { name: 'helpShop', done: 'helpShop=',
    apply: (t) => (/<ResetByCode(\s)/.test(t) ? t.replace(/<ResetByCode(\s)/, (m0, sp) => '<ResetByCode helpShop="mco"' + sp) : null) },
]);

// 5. the three shops: wrap <App /> in the gate
function wire(appDir) {
  const apiFile = path.join(root, 'apps', appDir, 'src', 'api.js');
  const ok = fs.existsSync(apiFile) && /export\s+(const|let|function)\s+api\b|export\s*\{[^}]*\bapi\b/.test(fs.readFileSync(apiFile, 'utf8'));
  if (!ok) { console.log('NOT FOUND: ' + appDir + ' src/api.js does not export api. Send me its main.jsx and api.js.'); failed = true; return; }
  edit('apps/' + appDir + '/src/main.jsx', [
    { name: 'gate', done: 'MustChangeGate',
      apply: (t) => {
        if (!/<App\s*\/>/.test(t) || !/^import /m.test(t)) return null;
        t = t.replace(/^import /m, () => "import { MustChangeGate } from '@pyfon/ui';\nimport { api as gateApi } from './api.js';\nimport ");
        return t.replace(/<App\s*\/>/, () => '<MustChangeGate client={gateApi}><App /></MustChangeGate>');
      } },
  ]);
}
wire('prestige-m');
wire('trim-atelier');
wire('mco-brands');

// 6. Developer menu entry
edit('apps/m3labs/src/devNav.js', [
  { name: 'menu', done: "'/password-requests'",
    apply: rep("['/sessions', 'Live sessions', true],", "['/sessions', 'Live sessions', true], ['/password-requests', 'Password requests', true],") },
]);

// 7. CORS: add the dealer portal (port 5178). Only this one line is touched.
{
  const p = path.join(root, 'backend', '.env');
  if (!fs.existsSync(p)) { console.log('NOT FOUND (file): backend/.env'); failed = true; }
  else {
    const raw = fs.readFileSync(p, 'utf8');
    const m = raw.match(/^CORS_ORIGINS=(.*)$/m);
    if (!m) { console.log('NOT FOUND: CORS_ORIGINS line in backend/.env'); failed = true; }
    else if (m[1].includes('5178')) console.log('Already done: CORS has 5178');
    else {
      const v = m[1].trim();
      const q = /["']$/.test(v) ? v.slice(-1) : '';
      const nv = (q ? v.slice(0, -1) : v) + ',http://localhost:5178' + q;
      pending.push({ p, text: raw.replace(m[0], () => 'CORS_ORIGINS=' + nv) });
      console.log('Patched: CORS_ORIGINS now includes 5178');
    }
  }
}

// 8. Make sure the NEW dev password-help list wins over the old one in devUsers.js
{
  const p = path.join(root, 'backend', 'src', 'routes', 'groups.js');
  if (!fs.existsSync(p)) { console.log('NOT FOUND (file): groups.js'); failed = true; }
  else {
    const raw = fs.readFileSync(p, 'utf8');
    const crlf = raw.includes('\r\n');
    const lines = raw.replace(/\r\n/g, '\n').split('\n');
    const all = lines.join('\n');
    const idOf = (file) => {
      const m = all.match(new RegExp("import\\s+(?:\\{\\s*(?:\\w+\\s+as\\s+)?(\\w+)[^}]*\\}|(\\w+))\\s+from\\s+'[^']*" + file + "\\.js'"));
      return m ? (m[1] || m[2]) : null;
    };
    const a = idOf('devPasswordHelp');
    const b = idOf('devUsers');
    const useLine = (id) => lines.findIndex((l) => !/^\s*import\b/.test(l) && l.includes(id));
    if (!a || !b) console.log('NOTE: could not read the import names in groups.js. Send me groups.js.');
    else {
      const ia = useLine(a);
      const ib = useLine(b);
      if (ia < 0 || ib < 0) console.log('NOTE: could not find the mount lines in groups.js. Send me groups.js.');
      else if (ia < ib) console.log('OK: new password-help routes are mounted first');
      else if (/\.use\(.*\);\s*$/.test(lines[ia]) && /\.use\(.*\);\s*$/.test(lines[ib])) {
        const tmp = lines[ia]; lines[ia] = lines[ib]; lines[ib] = tmp;
        const text = lines.join('\n');
        pending.push({ p, text: crlf ? text.replace(/\n/g, '\r\n') : text });
        console.log('Patched: swapped mount order in groups.js so the new list wins');
      } else console.log('CLASH: send me groups.js');
    }
  }
}

// 9. Warn if the public password-help route may not accept { email, shop }
{
  const p = path.join(root, 'backend', 'src', 'routes', 'publicPasswordHelp.js');
  if (fs.existsSync(p)) {
    const t = fs.readFileSync(p, 'utf8');
    if (/\.strict\(\)/.test(t)) console.log('WARN: publicPasswordHelp.js uses strict(); the mco button may be refused');
    console.log(t.includes('shop') ? 'OK: password-help route mentions shop' : "NOTE: password-help route never mentions 'shop' (fine if it reads X-Interface)");
  }
}

if (failed) { console.log('FAIL: nothing was written'); process.exit(1); }
for (const w of pending) fs.writeFileSync(w.p, w.text);
console.log('PASS: ' + pending.length + ' file(s) written');
