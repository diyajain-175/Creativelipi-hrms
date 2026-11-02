import { getPool } from '../../db/pool.js';

function mapIncentive(row) {
  if (!row) return null;

  return {
    id: row.id,
    employeeId: row.employee_id,
    ruleCode: row.rule_code,
    amount: Number(row.amount || 0),
    points: Number(row.points || 0),
    reason: row.reason,
    period: row.period,
    recommendedBy: row.recommended_by,
    approvedBy: row.approved_by,
    status: row.status,
    createdAt: row.created_at,
  };
}

export const postgresIncentiveRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM incentives
      ORDER BY created_at DESC
    `);

    return rows.map(mapIncentive);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM incentives WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapIncentive(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(incentive) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO incentives (
        id,
        employee_id,
        rule_code,
        amount,
        points,
        reason,
        period,
        recommended_by,
        approved_by,
        status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        incentive.id,
        incentive.employeeId,
        incentive.ruleCode,
        incentive.amount || 0,
        incentive.points || 0,
        incentive.reason || null,
        incentive.period,
        incentive.recommendedBy || null,
        incentive.approvedBy || null,
        incentive.status,
      ]
    );

    return mapIncentive(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      employeeId: 'employee_id',
      ruleCode: 'rule_code',
      amount: 'amount',
      points: 'points',
      reason: 'reason',
      period: 'period',
      recommendedBy: 'recommended_by',
      approvedBy: 'approved_by',
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
      `UPDATE incentives
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapIncentive(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)),
        0
      ) AS max_id
      FROM incentives
      WHERE id LIKE 'INC-%'
    `);

    return `INC-${Number(rows[0].max_id) + 1}`;
  },
};