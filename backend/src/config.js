export const INTERFACES = ['mco', 'prestige', 'trim', 'm3-creative', 'm3-production', 'm3-finance', 'dev'];

if (!process.env.DATABASE_URL) {
  console.error('Missing environment variable: DATABASE_URL');
  process.exit(1);
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
};
