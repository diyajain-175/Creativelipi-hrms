import { getPool } from '../../db/pool.js';

function mapDesignation(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    departmentId: row.department_id,
    createdAt: row.created_at,
  };
}

export const postgresDesignationRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM designations
      ORDER BY name
    `);

    return rows.map(mapDesignation);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM designations WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapDesignation(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(designation) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO designations (
        id,
        name,
        department_id
      )
      VALUES ($1, $2, $3)
      RETURNING *`,
      [
        designation.id,
        designation.name,
        designation.departmentId || null,
      ]
    );

    return mapDesignation(rows[0]);
  },

  async update(id, patch) {
    const fields = [];
    const values = [];

    if (patch.name !== undefined) {
      fields.push(`name = $${values.length + 1}`);
      values.push(patch.name);
    }

    if (patch.departmentId !== undefined) {
      fields.push(`department_id = $${values.length + 1}`);
      values.push(patch.departmentId);
    }

    if (!fields.length) {
      return this.findById(id);
    }

    values.push(id);

    const pool = getPool();

    const { rows } = await pool.query(
      `UPDATE designations
       SET ${fields.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapDesignation(rows[0]);
  },
};