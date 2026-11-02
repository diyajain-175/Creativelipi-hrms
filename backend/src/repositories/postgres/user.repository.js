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
    createdAt: row.created_at,
  };
}

export const postgresUserRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM users
      ORDER BY created_at DESC
    `);

    return rows.map(mapUser);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapUser(rows[0]);
  },

  async findByEmail(email) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT *
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );

    return mapUser(rows[0]);
  },

  async findByEmployeeId(employeeId) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT *
       FROM users
       WHERE employee_id = $1
       LIMIT 1`,
      [employeeId]
    );

    return mapUser(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
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
        user.isActive ?? true,
      ]
    );

    return mapUser(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      email: 'email',
      passwordHash: 'password_hash',
      role: 'role',
      employeeId: 'employee_id',
      isActive: 'is_active',
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
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapUser(rows[0]);
  },
};