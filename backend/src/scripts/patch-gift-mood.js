import fs from 'node:fs';
const f = '../apps/gift-hub/src/Layout.jsx';
let s = fs.readFileSync(f, 'utf8');
let bad = 0;
function patch(name, find, make) {
  if (!s.includes(find)) { console.log((s.includes('ctxMood') ? 'Already done: ' : 'NOT FOUND: ') + name); if (!s.includes('ctxMood')) bad = 1; return; }
  s = s.replace(find, make);
  console.log('Patched: ' + name);
}
patch('param', "  const urlHim = new URLSearchParams(loc.search).get('for') === 'him';", () => "  const forParam = new URLSearchParams(loc.search).get('for');\n  const ctxMood = ['him', 'dad'].includes(forParam) ? 'him' : ['her', 'mum', 'wife-girlfriend', 'sister-friend'].includes(forParam) ? 'her' : null;");
patch('effect', "  useEffect(() => { if (urlHim) pick('him'); }, [urlHim]);", () => "  useEffect(() => { if (ctxMood) pick(ctxMood); }, [ctxMood]);");
if (s.includes('<div className="mood">')) {
  s = s.replace(/<div className="mood">[\s\S]*?<\/div>/, () => '<span />');
  console.log('Patched: toggle removed');
} else console.log('Already done: toggle');
if (bad) process.exit(1);
fs.writeFileSync(f, s);
