import { getPool } from '../../db/pool.js';

function mapReward(row) {
  if (!row) return null;

  return {
    id: row.id,
    employeeId: row.employee_id,
    title: row.title,
    category: row.category,
    points: Number(row.points || 0),
    period: row.period,
    awardedBy: row.awarded_by,
    createdAt: row.created_at,
  };
}

export const postgresRewardRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM rewards
      ORDER BY created_at DESC
    `);

    return rows.map(mapReward);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM rewards WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapReward(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(reward) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO rewards (
        id,
        employee_id,
        title,
        category,
        points,
        period,
        awarded_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        reward.id,
        reward.employeeId,
        reward.title,
        reward.category,
        reward.points || 0,
        reward.period || null,
        reward.awardedBy || null,
      ]
    );

    return mapReward(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      employeeId: 'employee_id',
      title: 'title',
      category: 'category',
      points: 'points',
      period: 'period',
      awardedBy: 'awarded_by',
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
      `UPDATE rewards
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapReward(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)),
        0
      ) AS max_id
      FROM rewards
      WHERE id LIKE 'REW-%'
    `);

    return `REW-${Number(rows[0].max_id) + 1}`;
  },
};