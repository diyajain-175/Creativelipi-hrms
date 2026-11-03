import fs from 'node:fs';
import { getPool } from './pool.js';

const sql = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

const pool = getPool();

await pool.query(sql);

console.log('Schema is up to date.');

await pool.end();