import fs from 'node:fs';
import path from 'node:path';
let bad = 0;
function rep(file, oldS, newS) {
  const s = fs.readFileSync(file, 'utf8');
  const name = path.basename(file);
  if (s.includes(newS)) { console.log('Already done: ' + name); return; }
  if (!s.includes(oldS)) { console.log('NOT FOUND in ' + name + ': ' + oldS.slice(0, 50)); bad = 1; return; }
  fs.writeFileSync(file, s.replace(oldS, () => newS));
  console.log('Patched: ' + name);
}
function del(file, oldS) {
  const s = fs.readFileSync(file, 'utf8');
  if (!s.includes(oldS)) { console.log('Already done: ' + path.basename(file)); return; }
  fs.writeFileSync(file, s.replace(oldS, () => ''));
  console.log('Patched: ' + path.basename(file) + ' (removed)');
}
const R = path.resolve('src', 'routes');
const sc = path.join(R, 'siteContent.js');
rep(sc, "const TOP = ['announce', 'home', 'msg', 'ctx', 'cities'];", "const TOP = ['announce', 'home', 'msg', 'ctx', 'cities', 'words', 'theme', 'navOrder'];");
rep(sc, 'k.length > 80', 'k.length > 400');
rep(sc, '    for (const k of Object.keys(v)) {', "    if (Object.keys(v).length > 300) throw new Error('Too many entries');\n    for (const k of Object.keys(v)) {");
const tryLine = '  try { value = walk(raw, 0); } catch (e) { return bad(res, e.message); }';
rep(sc, tryLine, tryLine + "\n  if (value.theme && Object.keys(value.theme).some((k) => !/^--pf-[a-z0-9-]+$/.test(k) || !/^#[0-9a-fA-F]{6}$/.test(value.theme[k]))) return bad(res, 'Bad colour');");
const g = path.join(R, 'groups.js');
del(g, "partnerRoutes.use('/content', partnerContentRoutes);\n");
rep(g, "devRoutes.use('/videos', siteVideoAdminRoutes);", "devRoutes.use('/videos', siteVideoAdminRoutes);\ndevRoutes.use('/content', partnerContentRoutes);");
process.exit(bad);
