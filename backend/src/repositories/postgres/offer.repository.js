import { getPool } from '../../db/pool.js';

function mapOffer(row) {
  if (!row) return null;

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    departmentId: row.department_id,
    designationId: row.designation_id,
    location: row.location,
    joiningDate: row.joining_date,
    basicSalary: Number(row.basic_salary || 0),
    allowances: Number(row.allowances || 0),
    teamLeaderId: row.team_leader_id,
    processManagerId: row.process_manager_id,
    status: row.status,
    employeeId: row.employee_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export const postgresOfferRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM offer_letters
      ORDER BY created_at DESC
    `);

    return rows.map(mapOffer);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM offer_letters WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapOffer(rows[0]);
  },

  async insert(offer) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO offer_letters (
        id,
        first_name,
        last_name,
        email,
        phone,
        role,
        department_id,
        designation_id,
        location,
        joining_date,
        basic_salary,
        allowances,
        team_leader_id,
        process_manager_id,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *`,
      [
        offer.id,
        offer.firstName,
        offer.lastName,
        offer.email,
        offer.phone || null,
        offer.role,
        offer.departmentId,
        offer.designationId,
        offer.location || null,
        offer.joiningDate,
        offer.basicSalary,
        offer.allowances || 0,
        offer.teamLeaderId || null,
        offer.processManagerId || null,
        offer.createdBy || null,
      ]
    );

    return mapOffer(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      status: 'status',
      employeeId: 'employee_id',
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
      `UPDATE offer_letters
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapOffer(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM '[0-9]+$') AS INTEGER)),
        0
      ) AS max_id
      FROM offer_letters
      WHERE id LIKE 'OFR-%'
    `);

    return `OFR-${Number(rows[0].max_id) + 1}`;
  },
};