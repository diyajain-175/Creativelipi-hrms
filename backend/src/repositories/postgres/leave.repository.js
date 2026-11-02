import { getPool } from '../../db/pool.js';

function mapLeave(row) {
  if (!row) return null;

  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveType: row.leave_type,
    startDate: row.start_date,
    endDate: row.end_date,
    days: Number(row.days || 0),
    reason: row.reason,
    status: row.status,
    decidedBy: row.decided_by,
    decisionNote: row.decision_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const postgresLeaveRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM leave_requests
      ORDER BY created_at DESC
    `);

    return rows.map(mapLeave);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM leave_requests WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapLeave(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(leave) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO leave_requests (
        id,
        employee_id,
        leave_type,
        start_date,
        end_date,
        days,
        reason,
        status,
        decided_by,
        decision_note
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        leave.id,
        leave.employeeId,
        leave.leaveType,
        leave.startDate,
        leave.endDate,
        leave.days,
        leave.reason || null,
        leave.status,
        leave.decidedBy || null,
        leave.decisionNote || null,
      ]
    );

    return mapLeave(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      employeeId: 'employee_id',
      leaveType: 'leave_type',
      startDate: 'start_date',
      endDate: 'end_date',
      days: 'days',
      reason: 'reason',
      status: 'status',
      decidedBy: 'decided_by',
      decisionNote: 'decision_note',
      updatedAt: 'updated_at',
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

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const pool = getPool();

    const { rows } = await pool.query(
      `UPDATE leave_requests
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapLeave(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM '[0-9]+$') AS INTEGER)),
        0
      ) AS max_id
      FROM leave_requests
      WHERE id LIKE 'LEAV-%'
    `);

    return `LEAV-${Number(rows[0].max_id) + 1}`;
  },
};