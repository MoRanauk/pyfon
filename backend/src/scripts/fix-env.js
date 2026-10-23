import fs from 'node:fs';
import path from 'node:path';
const ef = path.resolve('.env');
const bad = ['student_2023', 'bscstudent_2023', 'bscstudent2023', '1234567890qwerty'].sort((a, b) => b.length - a.length);
const np = process.env.NEWPASS || '';
if (np.length < 16 || /["'#\\\s$`]/.test(np)) { console.log('FAIL: use 16 or more characters, with no spaces, quotes, # , $ or backslash'); process.exit(1); }
if (bad.includes(np)) { console.log('FAIL: that one was pasted in the chat. Choose a new one.'); process.exit(1); }
const out = [];
for (let l of fs.readFileSync(ef, 'utf8').split(/\r?\n/)) {
  if (bad.includes(l.trim())) { console.log('Removed a stray line'); continue; }
  const b = bad.find((x) => l.endsWith(x) && l.includes('='));
  if (b) { l = l.slice(0, -b.length); console.log('Repaired a glued line: ' + l.split('=')[0]); }
  if (/^VAULT_PASSPHRASE=/.test(l)) continue;
  out.push(l);
}
while (out.length && out[out.length - 1] === '') out.pop();
out.push('VAULT_PASSPHRASE=' + np);
fs.writeFileSync(ef, out.join('\n') + '\n');
console.log('PASS. Keys now in .env: ' + out.filter((l) => /^[A-Z_]+=/.test(l)).map((l) => l.split('=')[0]).join(', '));
