import fs from 'node:fs';
const f = 'src/routes/partnerSend.js';
const old = "if (!r.ok) throw new HttpError(502, 'send_failed', 'OpenWA said HTTP ' + r.status);";
const neu = "if (!r.ok) { const why = (await r.text().catch(() => '')).slice(0, 200); throw new HttpError(502, 'send_failed', 'OpenWA said HTTP ' + r.status + (why ? ': ' + why : '')); }";
const t = fs.readFileSync(f, 'utf8');
if (t.includes(neu)) { console.log('Already done'); process.exit(0); }
if (!t.includes(old)) { console.log('NOT FOUND'); process.exit(1); }
fs.writeFileSync(f, t.replace(old, () => neu));
console.log('Patched');
