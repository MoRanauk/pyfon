import fs from 'fs';
const f = '../packages/theme/index.js';
let t = fs.readFileSync(f, 'utf8');
if (t.includes("accent: '#B4445F'")) { console.log('Already done'); process.exit(0); }
const a = "navy: '#14264A', gold: '#B8913A', bg: '#FFF9F4', surface: '#F7E9EE', text: '#1A2238', muted: '#6B6F85', border: '#EBDDE2', accent: '#B8913A', onAccent: '#14264A'";
const b = "navy: '#4A1F3D', gold: '#B98A5E', bg: '#FFF8F5', surface: '#FBEAE8', text: '#3A1B30', muted: '#7A6470', border: '#F0DCD8', accent: '#B4445F', onAccent: '#FFFFFF'";
if (!t.includes(a)) { console.log('NOT FOUND: prestige colours'); process.exit(1); }
t = t.replace(a, () => b).replace("name: 'Prestige M'", () => "name: 'Ribbon & Rose Gifts'");
fs.writeFileSync(f, t);
console.log('Patched theme');
