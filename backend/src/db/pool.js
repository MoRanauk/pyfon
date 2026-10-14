import { config } from '../config.js';

let Pool;
let connectionString = config.databaseUrl;

if (process.env.DB_DRIVER === 'neon-ws') {
  // Local use on networks that block port 5432: connect over port 443.
  const neon = await import('@neondatabase/serverless');
  const { default: ws } = await import('ws');
  neon.neonConfig.webSocketConstructor = ws;
  Pool = neon.Pool;
  connectionString = connectionString.replace('sslmode=verify-full', 'sslmode=require');
} else {
  const pg = await import('pg');
  Pool = pg.default.Pool;
}

export const pool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 30000,
});

export const query = (text, params) => pool.query(text, params);
