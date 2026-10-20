import fs from 'node:fs';
let bad = false;
function edit(file, marker, jobs) {
  let t = fs.readFileSync(file, 'utf8');
  if (t.includes(marker)) { console.log('Already done: ' + file); return; }
  for (const [a] of jobs) {
    if (t.split(a).length !== 2) { console.log('NOT FOUND or twice in ' + file + ': ' + a); bad = true; return; }
  }
  for (const [a, b] of jobs) { t = t.replace(a, () => b); }
  fs.writeFileSync(file, t);
  console.log('Patched: ' + file);
}
const hide = (tag) => "display: mode === 'ask' ? 'none' : " + tag;
edit('../packages/ui/src/HelpButton.jsx', 'onBack=', [
  ["<div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>", "<div style={{ display: mode === 'ask' ? 'none' : 'flex', gap: '10px', alignItems: 'center' }}>"],
  ["<p style={{ margin: '12px 0 8px', lineHeight: 1.4 }}>Would you like", "<p style={{ margin: '12px 0 8px', lineHeight: 1.4, display: mode === 'ask' ? 'none' : 'block' }}>Would you like"],
  ["<div style={{ display: 'flex', gap: '6px' }}>", "<div style={{ display: mode === 'ask' ? 'none' : 'flex', gap: '6px' }}>"],
  ['<HarunoChat ai={ai}', "<HarunoChat onBack={() => setMode('')} ai={ai}"],
]);
const backBtn = `{onBack ? <button type="button" onClick={onBack} aria-label="Back" style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', padding: '0 4px' }}>{'\\u2190'}</button> : null}`;
edit('../packages/ui/src/HarunoChat.jsx', 'onBack', [
  ['({ ai, faq = [], topics = {}, face = null })', '({ ai, faq = [], topics = {}, face = null, onBack = null })'],
  ["height: '320px'", "height: 'min(420px, 64vh)'"],
  ["marginTop: '10px', border: '1px solid #ddd'", "marginTop: '0px', border: '1px solid #ddd'"],
  ["<span style={{ background: '#fff', borderRadius: '50%', display: 'inline-flex' }}>{face}</span>", backBtn + "<span style={{ background: '#fff', borderRadius: '50%', display: 'inline-flex' }}>{face}</span>"],
]);
const body = "JSON.stringify({ question, notes, history: history || [] })";
edit('../apps/mco-brands/src/askAi.js', 'SITE', [
  ["import { API_URL } from './api.js';", "import { API_URL } from './api.js';\n\nconst SITE = 'M & Co. Brands';"],
  [body, "JSON.stringify({ question, notes, history: history || [], site: SITE })"],
]);
edit('../apps/m3labs/src/askAi.js', 'SITE', [
  ["import { API_URL, IFACE } from './api.js';", "import { API_URL, IFACE, STAGE, STAGE_LABEL } from './api.js';\n\nconst SITE = 'M3 Labs partner portal, ' + (STAGE_LABEL[STAGE] || 'staff') + ' desk';"],
  [body, "JSON.stringify({ question, notes, history: history || [], site: SITE })"],
]);
process.exit(bad ? 1 : 0);
