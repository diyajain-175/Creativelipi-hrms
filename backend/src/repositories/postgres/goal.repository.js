import { getPool } from '../../db/pool.js';

function mapGoal(row) {
  if (!row) return null;

  return {
    id: row.id,
    employeeId: row.employee_id,
    title: row.title,
    kpi: row.kpi,
    period: row.period,
    target: row.target,
    progress: Number(row.progress || 0),
    createdAt: row.created_at,
  };
}

export const postgresGoalRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM goals
      ORDER BY created_at DESC
    `);

    return rows.map(mapGoal);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM goals WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapGoal(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(goal) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO goals (
        id,
        employee_id,
        title,
        kpi,
        period,
        target,
        progress
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        goal.id,
        goal.employeeId,
        goal.title,
        goal.kpi || null,
        goal.period,
        goal.target || null,
        goal.progress || 0,
      ]
    );

    return mapGoal(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      employeeId: 'employee_id',
      title: 'title',
      kpi: 'kpi',
      period: 'period',
      target: 'target',
      progress: 'progress',
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
      `UPDATE goals
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapGoal(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM '[0-9]+$') AS INTEGER)),
        0
      ) AS max_id
      FROM goals
      WHERE id LIKE 'GOAL-%'
    `);

    return `GOAL-${Number(rows[0].max_id) + 1}`;
  },
};