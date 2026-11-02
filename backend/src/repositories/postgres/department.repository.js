import { getPool } from '../../db/pool.js';

function mapDepartment(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export const postgresDepartmentRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM departments
      ORDER BY name
    `);

    return rows.map(mapDepartment);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM departments WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapDepartment(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(department) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO departments (id, name)
       VALUES ($1, $2)
       RETURNING *`,
      [department.id, department.name]
    );

    return mapDepartment(rows[0]);
  },

  async update(id, patch) {
    if (patch.name === undefined) {
      return this.findById(id);
    }

    const pool = getPool();

    const { rows } = await pool.query(
      `UPDATE departments
       SET name = $1
       WHERE id = $2
       RETURNING *`,
      [patch.name, id]
    );

    return mapDepartment(rows[0]);
  },
};