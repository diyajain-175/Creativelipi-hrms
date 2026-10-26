import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const departments = [
  ['dept-creative', 'Creative Operations'],
  ['dept-sales', 'Sales'],
  ['dept-hr', 'Human Resources'],
  ['dept-finance', 'Finance'],
  ['dept-it', 'Information Technology'],
];

const designations = [
  ['des-associate', 'Content Associate', 'dept-creative'],
  ['des-tl', 'Team Leader', 'dept-creative'],
  ['des-pm', 'Process Manager', 'dept-creative'],
  ['des-hr', 'HR Manager', 'dept-hr'],
  ['des-fin', 'Finance Executive', 'dept-finance'],
  ['des-it', 'IT Administrator', 'dept-it'],
];

const employees = [
  [
    'EMP-1001',
    'CL-1001',
    'Asha',
    'Verma',
    'asha@hrms.com',
    '9876501001',
    'dept-creative',
    'des-associate',
    'employee',
    'EMP-2001',
    'EMP-3001',
    '2023-04-12',
    'Pune',
    32000,
    8000,
  ],
  [
    'EMP-1002',
    'CL-1002',
    'Priya',
    'Nair',
    'priya@hrms.com',
    '9876501002',
    'dept-creative',
    'des-associate',
    'employee',
    'EMP-2001',
    'EMP-3001',
    '2022-11-03',
    'Pune',
    34000,
    8500,
  ],
  [
    'EMP-1003',
    'CL-1003',
    'Vikram',
    'Shah',
    'vikram@hrms.com',
    '9876501003',
    'dept-creative',
    'des-associate',
    'employee',
    'EMP-2001',
    'EMP-3001',
    '2024-01-18',
    'Pune',
    30000,
    7000,
  ],
  [
    'EMP-1004',
    'CL-1004',
    'Meera',
    'Joshi',
    'meera@hrms.com',
    '9876501004',
    'dept-creative',
    'des-associate',
    'employee',
    'EMP-2002',
    'EMP-3001',
    '2023-08-21',
    'Pune',
    31000,
    7500,
  ],
  [
    'EMP-1005',
    'CL-1005',
    'Arjun',
    'Patel',
    'arjun@hrms.com',
    '9876501005',
    'dept-sales',
    'des-associate',
    'employee',
    'EMP-2002',
    'EMP-3001',
    '2021-06-09',
    'Mumbai',
    36000,
    9000,
  ],

  [
    'EMP-2001',
    'CL-2001',
    'Rohit',
    'Mehra',
    'rohit@hrms.com',
    '9876502001',
    'dept-creative',
    'des-tl',
    'team_leader',
    null,
    'EMP-3001',
    '2020-02-14',
    'Pune',
    52000,
    14000,
  ],
  [
    'EMP-2002',
    'CL-2002',
    'Ananya',
    'Iyer',
    'ananya@hrms.com',
    '9876502002',
    'dept-creative',
    'des-tl',
    'team_leader',
    null,
    'EMP-3001',
    '2019-09-02',
    'Pune',
    54000,
    15000,
  ],

  [
    'EMP-3001',
    'CL-3001',
    'Neha',
    'Kapoor',
    'neha@hrms.com',
    '9876503001',
    'dept-creative',
    'des-pm',
    'process_manager',
    null,
    null,
    '2018-05-11',
    'Pune',
    78000,
    22000,
  ],

  [
    'EMP-4001',
    'CL-4001',
    'Sanjay',
    'Rao',
    'sanjay@hrms.com',
    '9876504001',
    'dept-hr',
    'des-hr',
    'hr_admin',
    null,
    null,
    '2017-01-16',
    'Pune',
    86000,
    24000,
  ],

  [
    'EMP-5001',
    'CL-5001',
    'Kiran',
    'Das',
    'kiran@hrms.com',
    '9876505001',
    'dept-finance',
    'des-fin',
    'finance',
    null,
    null,
    '2019-03-04',
    'Pune',
    62000,
    16000,
  ],

  [
    'EMP-6001',
    'CL-6001',
    'Imran',
    'Khan',
    'imran@hrms.com',
    '9876506001',
    'dept-it',
    'des-it',
    'it_admin',
    null,
    null,
    '2020-07-27',
    'Pune',
    58000,
    12000,
  ],
];

async function insertEmployees(employeeList) {
  for (const employee of employeeList) {
    await client.query(
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
        basic_salary,
        allowances
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15
      )
      ON CONFLICT (id) DO NOTHING`,
      employee
    );
  }
}

async function seed() {
  await client.connect();

  try {
    await client.query('BEGIN');

    // Departments
    for (const [id, name] of departments) {
      await client.query(
        `INSERT INTO departments (id, name)
         VALUES ($1, $2)
         ON CONFLICT (id) DO NOTHING`,
        [id, name]
      );
    }

    // Designations
    for (const [id, name, departmentId] of designations) {
      await client.query(
        `INSERT INTO designations (id, name, department_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [id, name, departmentId]
      );
    }

    // Insert in dependency order
    const processManagers = employees.filter(
      (employee) => employee[8] === 'process_manager'
    );

    const teamLeaders = employees.filter(
      (employee) => employee[8] === 'team_leader'
    );

    const otherManagers = employees.filter((employee) =>
      ['hr_admin', 'finance', 'it_admin'].includes(employee[8])
    );

    const regularEmployees = employees.filter(
      (employee) => employee[8] === 'employee'
    );

    await insertEmployees(processManagers);
    await insertEmployees(teamLeaders);
    await insertEmployees(otherManagers);
    await insertEmployees(regularEmployees);

    // Login users
    const passwordHash = await bcrypt.hash('password123', 10);

    for (const employee of employees) {
      await client.query(
        `INSERT INTO users (
          id,
          email,
          password_hash,
          role,
          employee_id,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (id) DO NOTHING`,
        [
          `USR-${employee[0].slice(4)}`,
          employee[4],
          passwordHash,
          employee[8],
          employee[0],
        ]
      );
    }

    await client.query('COMMIT');

    console.log('HRMS seed data inserted successfully.');
    console.log('Login password for all demo users: password123');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

seed();