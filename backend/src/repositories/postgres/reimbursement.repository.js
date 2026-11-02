import { getPool } from '../../db/pool.js';

function mapReimbursement(row) {
  if (!row) return null;

  return {
    id: row.id,
    employeeId: row.employee_id,
    expenseType: row.expense_type,
    amount: Number(row.amount || 0),
    expenseDate: row.expense_date,
    description: row.description,
    receiptName: row.receipt_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const postgresReimbursementRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM reimbursements
      ORDER BY expense_date DESC
    `);

    return rows.map(mapReimbursement);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM reimbursements WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapReimbursement(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(reimbursement) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO reimbursements (
        id,
        employee_id,
        expense_type,
        amount,
        expense_date,
        description,
        receipt_name,
        status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        reimbursement.id,
        reimbursement.employeeId,
        reimbursement.expenseType,
        reimbursement.amount,
        reimbursement.expenseDate,
        reimbursement.description || null,
        reimbursement.receiptName || null,
        reimbursement.status || 'pending',
      ]
    );

    return mapReimbursement(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      employeeId: 'employee_id',
      expenseType: 'expense_type',
      amount: 'amount',
      expenseDate: 'expense_date',
      description: 'description',
      receiptName: 'receipt_name',
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
      `UPDATE reimbursements
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapReimbursement(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)),
        0
      ) AS max_id
      FROM reimbursements
      WHERE id LIKE 'REM-%'
    `);

    return `REM-${Number(rows[0].max_id) + 1}`;
  },
};