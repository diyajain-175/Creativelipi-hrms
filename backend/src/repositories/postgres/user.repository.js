import { getPool } from '../../db/pool.js';

function mapUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    employeeId: row.employee_id,
    isActive: row.is_active,
  };
}

export const postgresUserRepo = {
  async findByEmail(email) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );

    return mapUser(rows[0]);
  },

  async findByEmployeeId(employeeId) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM users
       WHERE employee_id = $1
       LIMIT 1`,
      [employeeId]
    );

    return mapUser(rows[0]);
  },

  async insert(user) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO users (
        id,
        email,
        password_hash,
        role,
        employee_id,
        is_active
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        user.id,
        user.email,
        user.passwordHash,
        user.role,
        user.employeeId,
        user.isActive,
      ]
    );

    return mapUser(rows[0]);
  },

  async update(id, patch) {
    const fields = [];
    const values = [];

    if (patch.role !== undefined) {
      fields.push(`role = $${values.length + 1}`);
      values.push(patch.role);
    }

    if (patch.isActive !== undefined) {
      fields.push(`is_active = $${values.length + 1}`);
      values.push(patch.isActive);
    }

    if (!fields.length) {
      return this.findByEmployeeId(id);
    }

    values.push(id);

    const pool = getPool();

    const { rows } = await pool.query(
      `UPDATE users
       SET ${fields.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapUser(rows[0]);
  },
};