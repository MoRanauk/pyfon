import { pool } from '../db/pool.js';
const { rows } = await pool.query("SELECT email, role, partner_stage, is_active, must_change_password FROM users WHERE role IN ('partner','developer') ORDER BY role, partner_stage");
console.table(rows);
await pool.end();
