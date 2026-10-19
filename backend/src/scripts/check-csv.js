import fs from 'node:fs';
import { pool } from '../db/pool.js';
import { checkCsv } from '../csv/importer.js';
const text = fs.readFileSync('../data/products.csv', 'utf8');
const { items, ...r } = await checkCsv(pool, text, false);
console.log(JSON.stringify({ rows: r.rows, errors: r.errors.length, create: r.create, update: r.update, skipped: r.skipped.length, fatal: r.fatal || null }));
await pool.end();
