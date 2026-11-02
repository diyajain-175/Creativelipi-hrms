import { getPool } from '../../db/pool.js';

function mapLeaveBalance(row) {
  if (!row) return null;

  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveType: row.leave_type,
    balance: Number(row.balance || 0),
  };
}

export const postgresLeaveBalanceRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM leave_balances
      ORDER BY employee_id, leave_type
    `);

    return rows.map(mapLeaveBalance);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM leave_balances WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapLeaveBalance(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(balance) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO leave_balances (
        id,
        employee_id,
        leave_type,
        balance
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *`,
      [
        balance.id,
        balance.employeeId,
        balance.leaveType,
        balance.balance || 0,
      ]
    );

    return mapLeaveBalance(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      employeeId: 'employee_id',
      leaveType: 'leave_type',
      balance: 'balance',
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
      `UPDATE leave_balances
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapLeaveBalance(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER)),
        0
      ) AS max_id
      FROM leave_balances
      WHERE id LIKE 'LB-%'
    `);

    return `LB-${Number(rows[0].max_id) + 1}`;
  },
};