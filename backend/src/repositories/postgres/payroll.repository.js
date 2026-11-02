import { getPool } from '../../db/pool.js';

function mapPayroll(row) {
  if (!row) return null;

  return {
    id: row.id,
    employeeId: row.employee_id,
    period: row.period,
    basic: Number(row.basic || 0),
    allowances: Number(row.allowances || 0),
    incentives: Number(row.incentives || 0),
    bonus: Number(row.bonus || 0),
    deductions: Number(row.deductions || 0),
    penalties: Number(row.penalties || 0),
    net: Number(row.net || 0),
    status: row.status,
    createdAt: row.created_at,
  };
}

export const postgresPayrollRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM payroll
      ORDER BY period DESC
    `);

    return rows.map(mapPayroll);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM payroll WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapPayroll(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(payroll) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO payroll (
        id,
        employee_id,
        period,
        basic,
        allowances,
        incentives,
        bonus,
        deductions,
        penalties,
        net,
        status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        payroll.id,
        payroll.employeeId,
        payroll.period,
        payroll.basic || 0,
        payroll.allowances || 0,
        payroll.incentives || 0,
        payroll.bonus || 0,
        payroll.deductions || 0,
        payroll.penalties || 0,
        payroll.net || 0,
        payroll.status || 'draft',
      ]
    );

    return mapPayroll(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      employeeId: 'employee_id',
      period: 'period',
      basic: 'basic',
      allowances: 'allowances',
      incentives: 'incentives',
      bonus: 'bonus',
      deductions: 'deductions',
      penalties: 'penalties',
      net: 'net',
      status: 'status',
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
      `UPDATE payroll
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapPayroll(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)),
        0
      ) AS max_id
      FROM payroll
      WHERE id LIKE 'PAY-%'
    `);

    return `PAY-${Number(rows[0].max_id) + 1}`;
  },
};