import { getPool } from '../../db/pool.js';

function mapAssetRequest(row) {
  if (!row) return null;

  return {
    id: row.id,
    employeeId: row.employee_id,
    assetType: row.asset_type,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const postgresAssetRequestRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM asset_requests
      ORDER BY created_at DESC
    `);

    return rows.map(mapAssetRequest);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM asset_requests WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapAssetRequest(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(request) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO asset_requests (
        id,
        employee_id,
        asset_type,
        reason,
        status
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *`,
      [
        request.id,
        request.employeeId,
        request.assetType,
        request.reason || null,
        request.status || 'pending',
      ]
    );

    return mapAssetRequest(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      employeeId: 'employee_id',
      assetType: 'asset_type',
      reason: 'reason',
      status: 'status',
    };

    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(patch)) {
      const column = allowedFields[key];

      if (!column) continue;

      updates.push(`${column} = $${values.length + 1}`);
      values.push(value);
    }

    if (!updates.length) {
      return this.findById(id);
    }

    values.push(id);

    const pool = getPool();

    const { rows } = await pool.query(
      `UPDATE asset_requests
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapAssetRequest(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM '[0-9]+$') AS INTEGER)),
        0
      ) AS max_id
      FROM asset_requests
      WHERE id LIKE 'ASTR-%'
    `);

    return `ASTR-${Number(rows[0].max_id) + 1}`;
  },
};