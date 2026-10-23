import { query } from '../db/pool.js';
import { hashPassword, generateTempPassword } from '../auth/password.js';

// Usage: node --env-file=.env src\scripts\add-dealer.js CODE "Name" "Speciality" email "Full name" [featured|no] ["Short blurb"]
const [code, name, speciality, email, fullName, flag, blurb] = process.argv.slice(2);
if (!code || !name || !speciality || !email || !fullName) {
  console.log('Usage: add-dealer.js CODE "Name" "Speciality" email "Full name" [featured|no] ["Blurb"]');
  process.exit(1);
}
if (!/^[A-Za-z0-9-]{2,30}$/.test(code)) { console.log('FAIL: code must be 2-30 letters, numbers or dashes'); process.exit(1); }
try {
  await query(
    `INSERT INTO vendors (code, name, speciality, blurb, featured) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, speciality = EXCLUDED.speciality,
       blurb = COALESCE(EXCLUDED.blurb, vendors.blurb), featured = EXCLUDED.featured`,
    [code, name, speciality, blurb || null, flag === 'featured']
  );
  const have = await query('SELECT id FROM users WHERE lower(email) = $1', [email.toLowerCase()]);
  if (have.rows[0]) console.log('A user with this email already exists. Login not changed.');
  else {
    await query(
      "INSERT INTO users (email, password_hash, full_name, role, vendor_code, must_change_password) VALUES ($1, $2, $3, 'vendor', $4, true)",
      [email.toLowerCase(), await hashPassword(generateTempPassword()), fullName, code]
    );
    console.log('Dealer login created. Now: Developer desk > People > Users > right-click the dealer > Send temporary password.');
  }
  console.log('PASS: dealer ' + code + (flag === 'featured' ? ' (featured)' : ''));
  process.exit(0);
} catch (err) {
  console.log('FAIL: ' + err.message);
  process.exit(1);
}
