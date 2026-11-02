import { getPool } from '../../db/pool.js';

function mapAssignment(row) {
  if (!row) return null;

  return {
    id: row.id,
    assetId: row.asset_id,
    employeeId: row.employee_id,
    assignedAt: row.assigned_at,
    returnedAt: row.returned_at,
    assignedBy: row.assigned_by,
  };
}

export const postgresAssetAssignmentRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM asset_assignments
      ORDER BY assigned_at DESC
    `);

    return rows.map(mapAssignment);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM asset_assignments WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapAssignment(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(assignment) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO asset_assignments (
        id,
        asset_id,
        employee_id,
        assigned_at,
        returned_at,
        assigned_by
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        assignment.id,
        assignment.assetId,
        assignment.employeeId,
        assignment.assignedAt,
        assignment.returnedAt || null,
        assignment.assignedBy || null,
      ]
    );

    return mapAssignment(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      assetId: 'asset_id',
      employeeId: 'employee_id',
      assignedAt: 'assigned_at',
      returnedAt: 'returned_at',
      assignedBy: 'assigned_by',
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
      `UPDATE asset_assignments
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapAssignment(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)),
        0
      ) AS max_id
      FROM asset_assignments
      WHERE id LIKE 'ASN-%'
    `);

    return `ASN-${Number(rows[0].max_id) + 1}`;
  },
};