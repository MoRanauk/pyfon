import { query } from '../db/pool.js';
const before = (await query('SELECT count(*)::int AS n FROM request_log')).rows[0].n;
await query('DELETE FROM request_log');
const after = (await query('SELECT count(*)::int AS n FROM request_log')).rows[0].n;
console.log('request_log: ' + before + ' rows removed, ' + after + ' left');
process.exit(0);
