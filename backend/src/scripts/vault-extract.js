import fs from 'node:fs';
import path from 'node:path';
import { query } from '../db/pool.js';
import { unseal } from '../vaultCrypto.js';

const id = process.argv[2];
const out = process.argv[3];
if (!id || !out) { console.log('Use: node --env-file=.env src\\scripts\\vault-extract.js <id> <folder>'); process.exit(1); }
const { rows } = await query('SELECT * FROM code_vault WHERE id = $1', [id]);
if (!rows[0]) { console.log('FAIL: no such snapshot'); process.exit(1); }
const data = unseal(rows[0], process.env.VAULT_PASSPHRASE || '');
const base = path.resolve(out);
for (const f of data.files) {
  const t = path.resolve(base, f.p);
  if (!t.startsWith(base)) continue;
  fs.mkdirSync(path.dirname(t), { recursive: true });
  fs.writeFileSync(t, f.c);
}
console.log('PASS: wrote ' + data.files.length + ' files to ' + base);
process.exit(0);
