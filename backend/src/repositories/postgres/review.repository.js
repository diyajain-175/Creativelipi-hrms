import { getPool } from '../../db/pool.js';

function mapReview(row) {
  if (!row) return null;

  return {
    id: row.id,
    employeeId: row.employee_id,
    period: row.period,
    score: row.score !== null ? Number(row.score) : null,
    managerFeedback: row.manager_feedback,
    employeeFeedback: row.employee_feedback,
    reviewerId: row.reviewer_id,
    createdAt: row.created_at,
  };
}

export const postgresReviewRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM performance_reviews
      ORDER BY created_at DESC
    `);

    return rows.map(mapReview);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM performance_reviews WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapReview(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(review) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO performance_reviews (
        id,
        employee_id,
        period,
        score,
        manager_feedback,
        employee_feedback,
        reviewer_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        review.id,
        review.employeeId,
        review.period,
        review.score ?? null,
        review.managerFeedback || null,
        review.employeeFeedback || null,
        review.reviewerId || null,
      ]
    );

    return mapReview(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      employeeId: 'employee_id',
      period: 'period',
      score: 'score',
      managerFeedback: 'manager_feedback',
      employeeFeedback: 'employee_feedback',
      reviewerId: 'reviewer_id',
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
      `UPDATE performance_reviews
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapReview(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)),
        0
      ) AS max_id
      FROM performance_reviews
      WHERE id LIKE 'REV-%'
    `);

    return `REV-${Number(rows[0].max_id) + 1}`;
  },
};