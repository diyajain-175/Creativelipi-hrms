import { getPool } from '../../db/pool.js';

function mapComment(row) {
  if (!row) return null;

  return {
    id: row.id,
    grievanceId: row.grievance_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export const postgresGrievanceCommentRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM grievance_comments
      ORDER BY created_at ASC
    `);

    return rows.map(mapComment);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM grievance_comments WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapComment(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(comment) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO grievance_comments (
        id,
        grievance_id,
        author_id,
        body
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *`,
      [
        comment.id,
        comment.grievanceId,
        comment.authorId,
        comment.body,
      ]
    );

    return mapComment(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)),
        0
      ) AS max_id
      FROM grievance_comments
      WHERE id LIKE 'GCM-%'
    `);

    return `GCM-${Number(rows[0].max_id) + 1}`;
  },
};