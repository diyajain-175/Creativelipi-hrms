import { getPool } from '../../db/pool.js';

function mapEmployeeCourse(row) {
  if (!row) return null;

  return {
    id: row.id,
    employeeId: row.employee_id,
    courseId: row.course_id,
    status: row.status,
    certificate: row.certificate,
    assignedBy: row.assigned_by,
    completedAt: row.completed_at,
  };
}

export const postgresEmployeeCourseRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM employee_courses
      ORDER BY completed_at DESC NULLS LAST
    `);

    return rows.map(mapEmployeeCourse);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM employee_courses WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapEmployeeCourse(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(record) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO employee_courses (
        id,
        employee_id,
        course_id,
        status,
        certificate,
        assigned_by,
        completed_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        record.id,
        record.employeeId,
        record.courseId,
        record.status || 'assigned',
        record.certificate || null,
        record.assignedBy || null,
        record.completedAt || null,
      ]
    );

    return mapEmployeeCourse(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      employeeId: 'employee_id',
      courseId: 'course_id',
      status: 'status',
      certificate: 'certificate',
      assignedBy: 'assigned_by',
      completedAt: 'completed_at',
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
      `UPDATE employee_courses
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapEmployeeCourse(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM '[0-9]+$') AS INTEGER)),
        0
      ) AS max_id
      FROM employee_courses
      WHERE id LIKE 'ECRS-%'
    `);

    return `ECRS-${Number(rows[0].max_id) + 1}`;
  },
};