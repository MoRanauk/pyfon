import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(process.cwd(), '../apps/m3labs/src/');
const app = path.join(dir, 'App.jsx');
const nav = path.join(dir, 'devNav.js');
let a = fs.readFileSync(app, 'utf8');
let n = fs.readFileSync(nav, 'utf8');
if (a.includes('ErrorExplainer')) { console.log('Already done'); process.exit(0); }
const i1 = "import DevUsers from './DevUsers.jsx';";
const r1 = '<Route path="/users" element={<DevUsers />} />';
const n1 = "['/errors', 'Error catalogue', false]";
if (!a.includes(i1) || !a.includes(r1) || !n.includes(n1)) { console.log('NOT FOUND'); process.exit(1); }
a = a.replace(i1, i1 + "\nimport ErrorExplainer from './ErrorExplainer.jsx';");
a = a.replace(r1, r1 + '\n        <Route path="/errors" element={<ErrorExplainer />} />');
n = n.replace(n1, "['/errors', 'Error explainer', true]");
fs.writeFileSync(app, a);
fs.writeFileSync(nav, n);
console.log('Patched');
