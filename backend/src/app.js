import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { query } from './db/pool.js';
import { HttpError } from './errors.js';
import { requestLogger } from './middleware/requestLogger.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import { customerRoutes, partnerRoutes, devRoutes, vendorRoutes } from './routes/groups.js';
import { publicDealerRoutes } from './routes/publicDealers.js';

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

// Product images: plain files, public, allowed to load on our other sites.
app.use(
  '/images',
  (req, res, next) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(fileURLToPath(new URL('../public/product-images', import.meta.url)), { maxAge: '1d' }),
);

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

app.use('/v1/auth', authRoutes);
app.use('/v1/catalog', catalogRoutes);
app.use('/v1/customer', customerRoutes);
app.use('/v1/partner', partnerRoutes);
app.use('/v1/dev', devRoutes);
app.use('/v1/vendor', vendorRoutes);
app.use('/v1/dealers', publicDealerRoutes);

app.use((req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Route not found' } });
});

app.use((err, req, res, next) => {
  const known = err instanceof HttpError;
  const badBody = err.type === 'entity.parse.failed' || err.type === 'entity.too.large';
  const status = known || badBody ? err.status : 500;
  if (status >= 500) {
    console.error(JSON.stringify({ level: 'error', requestId: req.id, message: err.message }));
  }
  res.status(status).json({
    error: {
      code: known ? err.code : badBody ? 'bad_request' : 'server_error',
      message: known ? err.message : badBody ? 'Invalid request body' : 'Something went wrong',
      details: known ? err.details : undefined,
      requestId: req.id,
    },
  });
});

export default app;
