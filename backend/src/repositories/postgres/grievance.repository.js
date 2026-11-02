import { getPool } from '../../db/pool.js';

function mapGrievance(row) {
  if (!row) return null;

  return {
    id: row.id,
    employeeId: row.employee_id,
    subject: row.subject,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    assignedTo: row.assigned_to,
    resolution: row.resolution,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const postgresGrievanceRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM grievances
      ORDER BY created_at DESC
    `);

    return rows.map(mapGrievance);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM grievances WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapGrievance(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(grievance) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO grievances (
        id,
        employee_id,
        subject,
        description,
        category,
        priority,
        status,
        assigned_to,
        resolution
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        grievance.id,
        grievance.employeeId,
        grievance.subject,
        grievance.description,
        grievance.category,
        grievance.priority || 'medium',
        grievance.status || 'open',
        grievance.assignedTo || null,
        grievance.resolution || null,
      ]
    );

    return mapGrievance(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      employeeId: 'employee_id',
      subject: 'subject',
      description: 'description',
      category: 'category',
      priority: 'priority',
      status: 'status',
      assignedTo: 'assigned_to',
      resolution: 'resolution',
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
      `UPDATE grievances
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapGrievance(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)),
        0
      ) AS max_id
      FROM grievances
      WHERE id LIKE 'GRV-%'
    `);

    return `GRV-${Number(rows[0].max_id) + 1}`;
  },
};