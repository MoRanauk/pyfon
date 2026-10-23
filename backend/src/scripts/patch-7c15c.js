import fs from 'node:fs';
import path from 'node:path';
let bad = 0;
const D = path.resolve('..', 'apps', 'prestige-m', 'src');
function rep(name, oldS, newS) {
  const file = path.join(D, name);
  const s = fs.readFileSync(file, 'utf8');
  if (s.includes(newS)) { console.log('Already done: ' + name); return; }
  if (!s.includes(oldS)) { console.log('NOT FOUND in ' + name + ': ' + oldS.slice(0, 50)); bad = 1; return; }
  fs.writeFileSync(file, s.replace(oldS, () => newS));
  console.log('Patched: ' + name);
}
const c = 'content.js';
rep(c, "import { SITE, DELIVER_TO, FLOWER_MEGA, ANNOUNCE } from './site.js';", "import { SITE, DELIVER_TO, FLOWER_MEGA, ANNOUNCE } from './site.js';\nimport { CITIES } from './cities.js';\nexport { CITIES };");
rep(c, "{ title: 'Deliver To', links: DELIVER_TO.map((d) => (d[1] === 'shop' ? [d[0], '/shop'] : [d[0], wa(d[1]), true])) },", "{ title: 'Deliver To', to: '/deliver/zones', links: CITIES.map((x) => [x.name, '/deliver/' + x.slug]) },");
rep(c, "['Birthday Cards', '/shop?q=card']", "['Birthday Cards', '/shop?style=card']");
rep(c, "['Flower hampers', '/shop?q=flower']", "['Flower hampers', '/c/hampers?q=flower']");
rep(c, "['Flower and cake', '/shop?q=cake']", "['Flower and cake', '/c/hampers?q=cake']");
rep(c, "['Teddy bears', '/shop?q=teddy']", "['Teddy bears', '/c/sweets?q=teddy']");
const old = 'export const CONTENT = { announce: ANNOUNCE, home: HOME, msg: MSG, ctx: CTX, ticks: TICKS, trust: TRUST, faq: FAQ, more: MORE };';
rep(c, old, old.replace('more: MORE }', 'more: MORE, cities: {} }') + "\nconst isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);\nexport function mergeContent(base, over) {\n  if (!isObj(base) || !isObj(over)) return over === undefined ? base : over;\n  const out = { ...base };\n  Object.keys(over).forEach((k) => { out[k] = mergeContent(base[k], over[k]); });\n  return out;\n}");
rep('App.jsx', "import Series from './Series.jsx';", "import Series from './Series.jsx';\nimport Deliver from './Deliver.jsx';");
rep('App.jsx', '<Route path="/c/personalised" element={<Series />} />', '<Route path="/c/personalised" element={<Series />} />\n        <Route path="/deliver/:slug" element={<Deliver />} />');
rep('Layout.jsx', "import { NAVTREE, CONTENT, ContentProvider, wa } from './content.js';", "import { NAVTREE, CONTENT, ContentProvider, wa, mergeContent } from './content.js';");
rep('Layout.jsx', "import { img } from './api.js';", "import { img, API_URL } from './api.js';");
rep('Layout.jsx', 'const [content] = useState(CONTENT);', "const [content, setContent] = useState(CONTENT);\n  useEffect(() => { fetch(API_URL + '/v1/content/prestige').then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && j.data) setContent(mergeContent(CONTENT, j.data)); }).catch(() => {}); }, []);");
const sf = path.join(D, 'site.js');
const t = fs.readFileSync(sf, 'utf8');
const re = /^[ \t]*'Order before 4pm[^\r\n]*\r?\n/m;
if (re.test(t)) { fs.writeFileSync(sf, t.replace(re, '')); console.log('Patched: site.js (4pm line removed)'); } else console.log('Already done: site.js');
process.exit(bad);
