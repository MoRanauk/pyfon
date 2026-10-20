import fs from 'node:fs';
let bad = false;
function edit(file, fn) {
  const t = fs.readFileSync(file, 'utf8');
  const r = fn(t);
  if (r === null) { console.log('NOT FOUND in ' + file); bad = true; return; }
  if (r === t) { console.log('Already done: ' + file); return; }
  fs.writeFileSync(file, r);
  console.log('Patched: ' + file);
}
edit('../packages/ui/src/HelpButton.jsx', (t) => {
  if (t.includes('HarunoChat')) return t;
  const re = /\{mode === 'ask' \? \([\s\S]*?\r?\n {10}\) : null\}/;
  if (!re.test(t) || !t.includes("import { useState, useEffect, useRef } from 'react';")) return null;
  const eol = t.includes('\r\n') ? '\r\n' : '\n';
  let r = t.replace(re, () => "{mode === 'ask' ? <HarunoChat ai={ai} faq={faq} topics={topics} face={<Face size={34} />} /> : null}");
  r = r.replace("import { useState, useEffect, useRef } from 'react';", () => "import { useState, useEffect, useRef } from 'react';" + eol + "import HarunoChat from './HarunoChat.jsx';");
  return r;
});
for (const f of ['../apps/m3labs/src/askAi.js', '../apps/mco-brands/src/askAi.js']) {
  edit(f, (t) => {
    if (t.includes('history')) return t;
    if (!t.includes('askAi(question, notes) {') || !t.includes('JSON.stringify({ question, notes })')) return null;
    return t.replace('askAi(question, notes) {', () => 'askAi(question, notes, history) {').replace('JSON.stringify({ question, notes })', () => 'JSON.stringify({ question, notes, history: history || [] })');
  });
}
process.exit(bad ? 1 : 0);
