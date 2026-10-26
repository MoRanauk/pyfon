const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const map = { 'gift-hub': 'pyfon-gifthub', 'trim-atelier': 'pyfon-trimatelier', 'm3labs': 'pyfonlab', 'mco-brands': 'pyfon-mco', 'dealer': 'pyfon-dealer', 'studio': 'pyfon-studio' };
for (const k of Object.keys(map)) {
  const f = path.join(root, 'apps', k, 'wrangler.jsonc');
  const s = fs.readFileSync(f, 'utf8');
  const n = s.replace(/"name":\s*"[^"]*"/, '"name": "' + map[k] + '"');
  if (n !== s) fs.writeFileSync(f, n);
  console.log(k + ' -> ' + map[k] + (n !== s ? ' (changed)' : ' (same)'));
}
