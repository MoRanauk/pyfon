const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const CODE_A = "const CODE = /^[A-Z0-9]{10}$/;";
const CODE_B = "const CODE = /^[A-Z0-9]{4,20}$/;";
const MSG_A = "'The M-Pesa code has 10 letters and numbers'";
const MSG_B = "'Type the M-Pesa code (4 to 20 letters and numbers)'";
const jobs = [
  ['backend/src/routes/partnerPayments.js', [[CODE_A, CODE_B], [MSG_A, MSG_B]]],
  ['backend/src/routes/partnerPaymentGroups.js', [[CODE_A, CODE_B], [MSG_A, MSG_B]]],
  ['apps/m3labs/src/Payments.jsx', [['code.trim().length !== 10', 'code.trim().length < 4']]],
];
const writes = [];
let bad = false;
for (const [file, edits] of jobs) {
  const p = path.join(root, file);
  const raw = fs.readFileSync(p, 'utf8');
  const crlf = raw.includes('\r\n');
  let s = raw.replace(/\r\n/g, '\n');
  for (const [a, b] of edits) {
    if (s.includes(a)) { s = s.split(a).join(b); }
    else if (s.includes(b)) { console.log(file + ': already done'); }
    else { console.log(file + ': NOT FOUND: ' + a.slice(0, 60)); bad = true; }
  }
  if (crlf) s = s.replace(/\n/g, '\r\n');
  writes.push([p, s, file]);
}
if (bad) { console.log('Nothing written.'); process.exit(1); }
for (const [p, s, file] of writes) { fs.writeFileSync(p, s); console.log(file + ': Patched'); }
