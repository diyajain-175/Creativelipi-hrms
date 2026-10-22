import pg from 'pg';
import { env } from '../config/env.js';

let pool;

export function getPool() {
  if (env.useMockData) return null;
  if (!pool) {
    pool = new pg.Pool({ connectionString: env.databaseUrl });
  }
  return pool;
}
