import crypto from 'node:crypto';
import { INTERFACES } from '../config.js';
import { query } from '../db/pool.js';

export function requestLogger(req, res, next) {
  const started = process.hrtime.bigint();
  const incoming = req.get('x-request-id');
  req.id = incoming && /^[A-Za-z0-9-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  const tag = req.get('x-interface');
  req.interfaceCode = INTERFACES.includes(tag) ? tag : null;
  res.setHeader('X-Request-Id', req.id);

  res.on('finish', () => {
    const ms = Number((process.hrtime.bigint() - started) / 1000000n);
    const path = req.originalUrl.split('?')[0];
    console.log(JSON.stringify({
      level: 'info', requestId: req.id, interface: req.interfaceCode,
      userId: req.user?.id ?? null, method: req.method, path, status: res.statusCode, ms,
    }));
    if (path.startsWith('/health')) return;
    query(
      'INSERT INTO request_log (request_id, interface, user_id, method, path, status, duration_ms) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.id, req.interfaceCode, req.user?.id ?? null, req.method, path, res.statusCode, ms]
    ).catch((err) =>
      console.error(JSON.stringify({ level: 'error', msg: 'request_log insert failed', error: err.message }))
    );
  });
  next();
}
