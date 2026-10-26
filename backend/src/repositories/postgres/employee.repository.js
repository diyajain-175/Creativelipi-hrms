import { getPool } from '../../db/pool.js';

function mapEmployee(row) {
  if (!row) return null;

  return {
    id: row.id,
    employeeCode: row.employee_code,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    departmentId: row.department_id,
    designationId: row.designation_id,
    role: row.role,
    teamLeaderId: row.team_leader_id,
    processManagerId: row.process_manager_id,
    joiningDate: row.joining_date,
    location: row.location,
    employmentStatus: row.employment_status,
    basicSalary: Number(row.basic_salary || 0),
    allowances: Number(row.allowances || 0),
    bankName: row.bank_name,
    bankAccount: row.bank_account,
    ifsc: row.ifsc,
    documents: row.documents || [],
  };
}

export const postgresEmployeeRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM employees
      ORDER BY employee_code
    `);

    return rows.map(mapEmployee);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM employees WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapEmployee(rows[0]);
  },

  async findOne(predicate) {
    const employees = await this.all();
    return employees.find(predicate) || null;
  },

  async findByEmail(email) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM employees WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );

    return mapEmployee(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)),
        1000
      ) AS max_id
      FROM employees
      WHERE id LIKE 'EMP-%'
    `);

    return `EMP-${Number(rows[0].max_id) + 1}`;
  },

  async insert(employee) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO employees (
        id,
        employee_code,
        first_name,
        last_name,
        email,
        phone,
        department_id,
        designation_id,
        role,
        team_leader_id,
        process_manager_id,
        joining_date,
        location,
        employment_status,
        basic_salary,
        allowances,
        bank_name,
        bank_account,
        ifsc,
        documents
      )
      VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20
      )
      RETURNING *`,
      [
        employee.id,
        employee.employeeCode,
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.phone,
        employee.departmentId,
        employee.designationId,
        employee.role,
        employee.teamLeaderId,
        employee.processManagerId,
        employee.joiningDate,
        employee.location,
        employee.employmentStatus,
        employee.basicSalary,
        employee.allowances,
        employee.bankName,
        employee.bankAccount,
        employee.ifsc,
        JSON.stringify(employee.documents || []),
      ]
    );

    return mapEmployee(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      firstName: 'first_name',
      lastName: 'last_name',
      phone: 'phone',
      departmentId: 'department_id',
      designationId: 'designation_id',
      teamLeaderId: 'team_leader_id',
      processManagerId: 'process_manager_id',
      joiningDate: 'joining_date',
      location: 'location',
      employmentStatus: 'employment_status',
      basicSalary: 'basic_salary',
      allowances: 'allowances',
      bankName: 'bank_name',
      bankAccount: 'bank_account',
      ifsc: 'ifsc',
      role: 'role',
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
      `UPDATE employees
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapEmployee(rows[0]);
  },
};