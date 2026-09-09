import 'dotenv/config';

export const PORT = process.env.PORT;
export const NODE_ENV = process.env.NODE_ENV ?? 'development';
export const DATABASE_URL = process.env.DATABASE_URL;
export const SWAGGER_PATH = process.env.SWAGGER_PATH ?? 'api/docs';

// JWT
export const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'fallback_access_secret';
export const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'fallback_refresh_secret';
export const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
export const JWT_REFRESH_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

// AES-256 Encryption
export const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET ?? '';

console.log('\n', { PORT, NODE_ENV, DATABASE_URL }, '\n');
