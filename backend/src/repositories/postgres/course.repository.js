import { getPool } from '../../db/pool.js';

function mapCourse(row) {
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    hours: Number(row.hours || 0),
    createdAt: row.created_at,
  };
}

export const postgresCourseRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM learning_courses
      ORDER BY created_at DESC
    `);

    return rows.map(mapCourse);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM learning_courses WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapCourse(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(course) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO learning_courses (
        id,
        title,
        kind,
        hours
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *`,
      [
        course.id,
        course.title,
        course.kind,
        course.hours || 0,
      ]
    );

    return mapCourse(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      title: 'title',
      kind: 'kind',
      hours: 'hours',
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
      `UPDATE learning_courses
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapCourse(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)),
        0
      ) AS max_id
      FROM learning_courses
      WHERE id LIKE 'CRS-%'
    `);

    return `CRS-${Number(rows[0].max_id) + 1}`;
  },
};