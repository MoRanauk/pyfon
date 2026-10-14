import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { query } from './db/pool.js';
import { requestLogger } from './middleware/requestLogger.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin(origin, cb) {
    cb(null, !origin || config.corsOrigins.includes(origin));
  },
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Interface', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
}));
app.use(express.json({ limit: '100kb' }));
app.use(requestLogger);
app.use(rateLimit({ windowMs: 60000, limit: 300, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'pyfon-backend', time: new Date().toISOString() });
});

app.get('/health/db', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'error', db: 'down' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Route not found' } });
});

app.use((err, req, res, next) => {
  console.error(JSON.stringify({ level: 'error', requestId: req.id, message: err.message }));
  const clientError = err.status >= 400 && err.status < 500;
  res.status(clientError ? err.status : 500).json({
    error: {
      code: clientError ? 'bad_request' : 'server_error',
      message: clientError ? 'Bad request' : 'Something went wrong',
      requestId: req.id,
    },
  });
});

export default app;
