import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const ACC = [
  ['import', "import { errText, normPhone } from './lib.js';", "import { errText, normPhone } from './lib.js';\nimport PasswordHelp from './PasswordHelp.jsx';"],
  ['button', "{mode === 'up' ? 'I already have an account' : 'Create an account'}</button></p>", "{mode === 'up' ? 'I already have an account' : 'Create an account'}</button></p>\n      {mode === 'in' ? <PasswordHelp /> : null}"],
];
const jobs = [
  { file: 'backend/src/app.js', edits: [
    ['import', "import { publicTrackRoutes } from './routes/publicTrack.js';", "import { publicTrackRoutes } from './routes/publicTrack.js';\nimport { publicPasswordHelpRoutes } from './routes/publicPasswordHelp.js';"],
    ['mount', "app.use('/v1/track', publicTrackRoutes);", "app.use('/v1/track', publicTrackRoutes);\napp.use('/v1/password-help', publicPasswordHelpRoutes);"],
  ] },
  { file: 'backend/src/routes/groups.js', edits: [
    ['import', "import { devThemeRoutes } from './devTheme.js';", "import { devThemeRoutes } from './devTheme.js';\nimport { devPasswordHelpRoutes } from './devPasswordHelp.js';"],
    ['mount', "devRoutes.use('/theme', devThemeRoutes);", "devRoutes.use('/theme', devThemeRoutes);\ndevRoutes.use('/password-help', devPasswordHelpRoutes);"],
  ] },
  { file: 'apps/m3labs/src/App.jsx', edits: [
    ['import', "import ThemeManager from './ThemeManager.jsx';", "import ThemeManager from './ThemeManager.jsx';\nimport PasswordRequests from './PasswordRequests.jsx';"],
    ['route', '<Route path="/theme" element={<ThemeManager />} />', '<Route path="/theme" element={<ThemeManager />} />\n        <Route path="/password-requests" element={<PasswordRequests />} />'],
  ] },
  { file: 'apps/prestige-m/src/Account.jsx', edits: ACC },
  { file: 'apps/trim-atelier/src/Account.jsx', edits: ACC },
];

let miss = false;
const pending = [];
for (const j of jobs) {
  const full = path.join(root, j.file);
  const raw = fs.readFileSync(full, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let t = raw.replace(/\r\n/g, '\n');
  let changed = false;
  for (const [name, from, to] of j.edits) {
    if (t.includes(to)) { console.log('Already done: ' + j.file + ' / ' + name); continue; }
    if (!t.includes(from)) { console.log('NOT FOUND: ' + j.file + ' / ' + name); miss = true; continue; }
    t = t.replace(from, () => to);
    changed = true;
    console.log('Patched: ' + j.file + ' / ' + name);
  }
  pending.push({ full, t: t.replace(/\n/g, eol), changed });
}
if (miss) { console.log('FAIL: something was not found, nothing was written'); process.exit(1); }
for (const p of pending) if (p.changed) fs.writeFileSync(p.full, p.t, 'utf8');
console.log('PASS');
