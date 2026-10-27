const fs = require('fs');
const path = require('path');
const src = path.resolve(__dirname, '..');
const jobs = [];
let miss = false;
function load(rel) {
  const p = path.join(src, rel);
  const raw = fs.readFileSync(p, 'utf8');
  return { rel, p, crlf: raw.includes('\r\n'), s: raw.replace(/\r\n/g, '\n') };
}
function edit(f, pairs) {
  for (const [a] of pairs) {
    const n = f.s.split(a).length - 1;
    if (n !== 1) { console.log('NOT FOUND or not unique (' + n + ') in ' + f.rel + ': ' + a.slice(0, 80)); miss = true; }
  }
  if (miss) return;
  for (const [a, b] of pairs) f.s = f.s.replace(a, () => b);
  jobs.push(f);
}

const HELPER = [
  "async function findAccount(emailAddr, code, cols = '*', activeOnly = false) {",
  "  const act = activeOnly ? ' AND is_active' : '';",
  "  if (INTERFACE_KINDS[code] === 'customer') {",
  "    const r = await query('SELECT ' + cols + \" FROM users WHERE lower(email) = $1 AND role = 'customer' AND (shop = $2 OR shop IS NULL)\" + act + ' ORDER BY (shop IS NULL) LIMIT 1', [emailAddr, code]);",
  "    return r.rows[0] || null;",
  "  }",
  "  const r = await query('SELECT ' + cols + \" FROM users WHERE lower(email) = $1 AND role <> 'customer'\" + act + ' LIMIT 1', [emailAddr]);",
  "  return r.rows[0] || null;",
  "}",
  "",
  "const COOLDOWN_SECONDS = 120;",
].join('\n');

const au = load('routes/auth.js');
if (au.s.includes('findAccount')) console.log('Already done: routes/auth.js');
else edit(au, [
  ['const COOLDOWN_SECONDS = 120;', HELPER],
  ["  let user;", "  const taken = await query(\"SELECT 1 FROM users WHERE lower(email) = $1 AND (role <> 'customer' OR shop IS NULL OR shop = $2) LIMIT 1\", [data.email, req.interfaceCode]);\n  if (taken.rows[0]) throw new HttpError(409, 'email_taken', 'An account with this email already exists here. Please sign in.');\n  let user;"],
  ["\"INSERT INTO users (email, password_hash, full_name, role, phone) VALUES ($1, $2, $3, 'customer', $4) RETURNING", "\"INSERT INTO users (email, password_hash, full_name, role, phone, shop) VALUES ($1, $2, $3, 'customer', $4, $5) RETURNING"],
  ["[data.email, hash, data.full_name, phone]", "[data.email, hash, data.full_name, phone, req.interfaceCode]"],
  ["'An account with this email already exists'", "'An account with this email already exists here. Please sign in.'"],
  ["  const { rows } = await query('SELECT * FROM users WHERE lower(email) = $1', [data.email]);", "  const user = await findAccount(data.email, req.interfaceCode);"],
  ["  const user = rows[0];\n", ""],
  ["  const token = jwt.sign(", "  if (user.role === 'customer' && !user.shop) {\n    try { await query('UPDATE users SET shop = $2 WHERE id = $1 AND shop IS NULL', [user.id, req.interfaceCode]); user.shop = req.interfaceCode; } catch (e) { console.warn('shop claim skipped: ' + e.message); }\n  }\n  const token = jwt.sign("],
  ["  const found = await query('SELECT id, email, role, phone FROM users WHERE lower(email) = $1 AND is_active', [data.email]);", "  const u = await findAccount(data.email, req.interfaceCode, 'id, email, role, phone', true);"],
  ["  const u = found.rows[0] && found.rows[0].role === INTERFACE_KINDS[req.interfaceCode] ? found.rows[0] : null;\n", ""],
  ["  const ur = await query('SELECT id, role FROM users WHERE lower(email) = $1 AND is_active', [data.email]);", "  const u = await findAccount(data.email, req.interfaceCode, 'id, role', true);"],
  ["  const u = ur.rows[0];\n", ""],
]);

if (!miss) {
  const ph = load('routes/publicPasswordHelp.js');
  if (ph.s.includes("'prestige'")) console.log('Already done: routes/publicPasswordHelp.js');
  else edit(ph, [
    ["AND role = 'customer' AND is_active\", [body.email]", "AND role = 'customer' AND is_active AND ($2::text IS NULL OR shop = $2 OR shop IS NULL)\", [body.email, ['mco', 'prestige', 'trim'].includes(body.shop) ? body.shop : null]"],
  ]);
}
if (miss) { console.log('Nothing was written.'); process.exit(1); }
for (const j of jobs) { fs.writeFileSync(j.p, j.crlf ? j.s.replace(/\n/g, '\r\n') : j.s); console.log('Patched: ' + j.rel); }
console.log('PASS');
