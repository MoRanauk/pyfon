import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pool, query } from '../db/pool.js';

// Test helper for the dealer chain. Commands: setup | unassign | restore
const mode = process.argv[2];
const stateFile = path.join(os.tmpdir(), 'pyfon-dealer-chain-state.json');
const DEALER = 'DLR-TESTDEALER';

function fail(msg) {
  console.error('Error: ' + msg);
  process.exit(1);
}

try {
  if (mode === 'setup') {
    if (fs.existsSync(stateFile)) fail('a test is already set up. Run the restore command first.');
    const { rows } = await query('SELECT id, ref, status, current_step, production_mode, vendor_code, vendor_status FROM jobs ORDER BY id DESC LIMIT 1');
    if (!rows[0]) fail('there are no jobs yet. Place a test order on the storefront first.');
    fs.writeFileSync(stateFile, JSON.stringify(rows[0]));
    await query(
      "UPDATE jobs SET status = 'open', current_step = 'production', production_mode = 'dealer', vendor_code = $2, vendor_status = 'offered' WHERE id = $1",
      [rows[0].id, DEALER]
    );
    console.log('JOBREF:' + rows[0].ref);
  } else if (mode === 'unassign') {
    if (!fs.existsSync(stateFile)) fail('no test is set up.');
    const s = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    await query("UPDATE jobs SET production_mode = 'in_house', vendor_code = NULL WHERE id = $1", [s.id]);
    console.log('Unassigned ' + s.ref);
  } else if (mode === 'restore') {
    if (!fs.existsSync(stateFile)) fail('nothing to restore.');
    const s = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    await query(
      'UPDATE jobs SET status = $2, current_step = $3, production_mode = $4, vendor_code = $5, vendor_status = $6 WHERE id = $1',
      [s.id, s.status, s.current_step, s.production_mode, s.vendor_code, s.vendor_status]
    );
    fs.unlinkSync(stateFile);
    console.log('Restored ' + s.ref + ' to how it was.');
    try {
      const a = await query("SELECT count(*) AS n FROM audit_log WHERE action = 'vendor.job_status'");
      console.log('Audit rows for vendor.job_status: ' + a.rows[0].n);
    } catch (e) {
      console.log('(Could not count audit rows: ' + e.message + ')');
    }
  } else {
    fail('use setup, unassign or restore');
  }
} catch (err) {
  console.error('Error: ' + err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
