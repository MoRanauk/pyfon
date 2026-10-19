import fs from 'node:fs';
let bad = 0;
function patch(file, old, neu, label) {
  const t = fs.readFileSync(file, 'utf8');
  if (t.includes(neu)) { console.log('Already done: ' + label); return; }
  if (!t.includes(old)) { console.log('NOT FOUND: ' + label); bad++; return; }
  fs.writeFileSync(file, t.replace(old, () => neu));
  console.log('Patched: ' + label);
}
const g = 'src/routes/groups.js';
patch(g, "import { partnerConnectRoutes } from './partnerConnect.js';", "import { partnerConnectRoutes } from './partnerConnect.js';\nimport { partnerSendRoutes } from './partnerSend.js';", 'groups import');
patch(g, 'partnerRoutes.use(partnerConnectRoutes);', 'partnerRoutes.use(partnerConnectRoutes);\npartnerRoutes.use(partnerSendRoutes);', 'groups mount');
const a = 'src/routes/partnerActivity.js';
patch(a, "'settings.whatsapp_mode_changed': 'changed the WhatsApp mode',", "'settings.whatsapp_mode_changed': 'changed the WhatsApp mode',\n  'connect.sent': 'sent a message via',", 'activity wording');
patch(a, "'ticket.%', 'vendor.%']", "'ticket.%', 'vendor.%', 'connect.%']", 'activity group');
const c = '../apps/m3labs/src/Connect.jsx';
patch(c, "import { get } from './http.js';", "import { get, post } from './http.js';", 'Connect import');
const t = fs.readFileSync(c, 'utf8');
if (t.includes('connect/send')) console.log('Already done: Outbox');
else {
  const i = t.indexOf('function Outbox(');
  const j = t.indexOf('export default function Connect()');
  if (i < 0 || j < i) { console.log('NOT FOUND: Outbox'); bad++; }
  else { fs.writeFileSync(c, t.slice(0, i) + fs.readFileSync('src/scripts/outbox.txt', 'utf8').trim() + '\n\n' + t.slice(j)); console.log('Patched: Outbox'); }
}
process.exit(bad ? 1 : 0);
