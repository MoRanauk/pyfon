export const INTERFACE_KINDS = {
  mco: 'customer',
  prestige: 'customer',
  trim: 'customer',
  'm3-creative': 'partner',
  'm3-production': 'partner',
  'm3-finance': 'partner',
  dev: 'developer',
  vendor: 'vendor',
};
export const INTERFACES = Object.keys(INTERFACE_KINDS);

for (const name of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[name]) {
    console.error('Missing environment variable: ' + name);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
};
