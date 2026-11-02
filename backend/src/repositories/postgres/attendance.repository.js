import { getPool } from '../../db/pool.js';

function mapAttendance(row) {
  if (!row) return null;

  return {
    id: row.id,
    employeeId: row.employee_id,
    workDate: row.work_date,
    checkIn: row.check_in,
    checkOut: row.check_out,
    status: row.status,
    workingMinutes: Number(row.working_minutes || 0),
    overtimeMinutes: Number(row.overtime_minutes || 0),
    source: row.source,
    createdAt: row.created_at,
  };
}

export const postgresAttendanceRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM attendance
      ORDER BY work_date DESC
    `);

    return rows.map(mapAttendance);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM attendance WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapAttendance(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(attendance) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO attendance (
        id,
        employee_id,
        work_date,
        check_in,
        check_out,
        status,
        working_minutes,
        overtime_minutes,
        source
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        attendance.id,
        attendance.employeeId,
        attendance.workDate,
        attendance.checkIn,
        attendance.checkOut,
        attendance.status,
        attendance.workingMinutes || 0,
        attendance.overtimeMinutes || 0,
        attendance.source || 'manual',
      ]
    );

    return mapAttendance(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      employeeId: 'employee_id',
      workDate: 'work_date',
      checkIn: 'check_in',
      checkOut: 'check_out',
      status: 'status',
      workingMinutes: 'working_minutes',
      overtimeMinutes: 'overtime_minutes',
      source: 'source',
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
      `UPDATE attendance
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapAttendance(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)),
        0
      ) AS max_id
      FROM attendance
      WHERE id LIKE 'ATT-%'
    `);

    return `ATT-${Number(rows[0].max_id) + 1}`;
  },
};