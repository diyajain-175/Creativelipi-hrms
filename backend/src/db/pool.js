import pg from 'pg';
import { env } from '../config/env.js';

pg.types.setTypeParser(1082, (value) => value);

let pool;

export function getPool() {
  if (env.useMockData) return null;
  if (!pool) {
    const isLocal = /localhost|127\.0\.0\.1/.test(env.databaseUrl);
    pool = new pg.Pool({
      connectionString: env.databaseUrl,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}