import { getPool } from '../../db/pool.js';

function mapAudit(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    module: row.module,
    recordId: row.record_id,
    meta: row.meta,
    createdAt: row.created_at,
  };
}

export const postgresAuditRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM audit_logs
      ORDER BY created_at DESC
    `);

    return rows.map(mapAudit);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM audit_logs WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapAudit(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(log) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO audit_logs (
        id,
        user_id,
        action,
        module,
        record_id,
        meta
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        log.id,
        log.userId || null,
        log.action,
        log.module,
        log.recordId || null,
        log.meta ? JSON.stringify(log.meta) : null,
      ]
    );

    return mapAudit(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)),
        0
      ) AS max_id
      FROM audit_logs
      WHERE id LIKE 'AUD-%'
    `);

    return `AUD-${Number(rows[0].max_id) + 1}`;
  },
};
