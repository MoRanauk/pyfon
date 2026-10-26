const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', '..', '..', 'packages', 'ui', 'src', 'themeMode.js');
let s = fs.readFileSync(file, 'utf8');
const re = /(export function getMode\(\) \{[\s\S]*?)return 'system';/;
if (!re.test(s)) { console.log(s.includes("return 'light';") ? 'Already done' : 'NOT FOUND'); process.exit(s.includes("return 'light';") ? 0 : 1); }
s = s.replace(re, (m, a) => a + "return 'light';");
fs.writeFileSync(file, s);
console.log('Patched');
