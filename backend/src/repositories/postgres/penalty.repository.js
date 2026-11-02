import { getPool } from '../../db/pool.js';

function mapPenalty(row) {
  if (!row) return null;

  return {
    id: row.id,
    employeeId: row.employee_id,
    reason: row.reason,
    amount: Number(row.amount || 0),
    penaltyDate: row.penalty_date,
    period: row.period,
    addedBy: row.added_by,
    status: row.status,
    createdAt: row.created_at,
  };
}

export const postgresPenaltyRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM penalties
      ORDER BY penalty_date DESC
    `);

    return rows.map(mapPenalty);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM penalties WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapPenalty(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(penalty) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO penalties (
        id,
        employee_id,
        reason,
        amount,
        penalty_date,
        period,
        added_by,
        status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        penalty.id,
        penalty.employeeId,
        penalty.reason,
        penalty.amount,
        penalty.penaltyDate,
        penalty.period,
        penalty.addedBy || null,
        penalty.status || 'pending',
      ]
    );

    return mapPenalty(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      employeeId: 'employee_id',
      reason: 'reason',
      amount: 'amount',
      penaltyDate: 'penalty_date',
      period: 'period',
      addedBy: 'added_by',
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
      `UPDATE penalties
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapPenalty(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)),
        0
      ) AS max_id
      FROM penalties
      WHERE id LIKE 'PEN-%'
    `);

    return `PEN-${Number(rows[0].max_id) + 1}`;
  },
};