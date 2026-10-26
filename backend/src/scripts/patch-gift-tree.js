import fs from 'node:fs';
const base = '../apps/gift-hub/src/';
function patch(file, name, find, to) {
  let s = fs.readFileSync(base + file, 'utf8');
  if (s.includes(to)) { console.log('Already done: ' + name); return 0; }
  if (!s.includes(find)) { console.log('NOT FOUND: ' + name); return 1; }
  fs.writeFileSync(base + file, s.replace(find, () => to));
  console.log('Patched: ' + name);
  return 0;
}
let bad = 0;
bad += patch('content.js', 'import', "import { CITIES } from './cities.js';", "import { CITIES } from './cities.js';\r\nimport { PCOLS } from './personalised.js';");
bad += patch('content.js', 'menu', "{ title: 'Personalised', to: '/c/personalised', links: [['Mugs and bottles', '/c/personalised?sub=Mugs%20and%20bottles'], ['Photo gifts', '/c/personalised?sub=Photo%20gifts'], ['Name gifts', '/c/personalised?sub=Name%20gifts'], ['Cushions', '/c/personalised?sub=Cushions']] },", "{ title: 'Personalised', to: '/c/personalised', wide: true, cols: PCOLS },");
bad += patch('Sub.jsx', 'filter', "const PARAMS = ['for', 'occasion', 'flower', 'style', 'colour', 'delivery'];", "const PARAMS = ['for', 'occasion', 'flower', 'style', 'colour', 'delivery', 'node'];");
process.exit(bad ? 1 : 0);
