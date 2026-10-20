import fs from 'fs';
import path from 'path';
const file = path.resolve(process.cwd(), '../apps/m3labs/src/Layout.jsx');
let s = fs.readFileSync(file, 'utf8');
let bad = false;
function rep(a, b, marker) {
  if (s.includes(marker)) { console.log('Already done: ' + marker); return; }
  if (!s.includes(a)) { console.log('NOT FOUND: ' + a.slice(0, 60)); bad = true; return; }
  s = s.replace(a, () => b);
  console.log('Patched: ' + marker);
}
rep("import { HELP_TOPICS, HELP_FAQ } from './helpTopics.js';", "import { HELP_TOPICS, HELP_FAQ } from './helpTopics.js';\nimport { HELP_TOURS } from './helpTours.js';", 'HELP_TOURS }');
rep('faq={HELP_FAQ} />', 'faq={HELP_FAQ} tours={HELP_TOURS} />', 'tours={HELP_TOURS}');
fs.writeFileSync(file, s);
process.exit(bad ? 1 : 0);
