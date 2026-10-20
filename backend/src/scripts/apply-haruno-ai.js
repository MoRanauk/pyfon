import fs from 'node:fs';
const file = '../packages/ui/src/HelpButton.jsx';
let t = fs.readFileSync(file, 'utf8');
if (t.includes('const [busy, setBusy]')) { console.log('Already done'); process.exit(0); }
const eol = t.includes('\r\n') ? '\r\n' : '\n';
const body3 = [
  "if (busy) return;",
  "const local = scored.map((x) => x.e);",
  "if (!ai) { setFound(local); return; }",
  "const rest = pool.filter((e) => !local.includes(e));",
  "const notes = local.concat(rest).slice(0, 12).map((e) => ({ q: String(e.q || '').slice(0, 300), a: String(e.a || '').slice(0, 800) }));",
  "setBusy(true);",
  "setFound(null);",
  "ai(q.slice(0, 300), notes).then((a) => setFound(a ? [{ q: 'Here is what I found:', a }] : local)).catch(() => setFound(local)).then(() => setBusy(false));",
].join(eol + '    ');
const jobs = [
  ['lift = 0 }) {', 'lift = 0, ai = null }) {'],
  ['const [found, setFound] = useState(null);', 'const [found, setFound] = useState(null);' + eol + '  const [busy, setBusy] = useState(false);'],
  ['setFound(scored.map((x) => x.e));', body3],
  ['onClick={ask}>Send</button>', "onClick={ask} disabled={busy}>{busy ? '...' : 'Send'}</button>"],
  ['My answers come from built-in guides. Nothing leaves this site, and I never see your orders or account.', "{ai ? 'Only your typed question and our help guides are sent to an AI service. I never see your orders, account or money.' : 'My answers come from built-in guides. Nothing leaves this site, and I never see your orders or account.'}"],
];
for (const [a] of jobs) { if (!t.includes(a)) { console.log('NOT FOUND: ' + a); process.exit(1); } }
for (const [a, b] of jobs) { t = t.replace(a, () => b); }
fs.writeFileSync(file, t);
console.log('Patched');
