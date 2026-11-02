
import { postgresPayrollRepo } from '../repositories/postgres/payroll.repository.js';
import { postgresEmployeeRepo } from '../repositories/postgres/employee.repository.js';
import { postgresIncentiveRepo } from '../repositories/postgres/incentive.repository.js';
import { postgresPenaltyRepo } from '../repositories/postgres/penalty.repository.js';
import {
  accessibleEmployeeIds,
  assertEmployeeAccess,
  canViewSalary,
} from './scope.service.js';
import { forbidden, notFound } from '../utils/errors.js';
import { writeAudit } from './audit.service.js';
import { notifyEmployee } from './notification.service.js';
import { INCENTIVE_STATUS } from '../config/workflows.js';

export function computeNet({
  basic,
  allowances,
  incentives,
  bonus,
  deductions,
  penalties,
}) {
  return (
    Number(basic) +
    Number(allowances) +
    Number(incentives) +
    Number(bonus) -
    Number(deductions) -
    Number(penalties)
  );
}

export function formulaText() {
  return 'Basic + Allowances + Incentives + Bonus - Deductions - Penalties';
}

async function withName(row) {
  const employee = await postgresEmployeeRepo.findById(row.employeeId);

  return {
    ...row,
    employeeName: employee
      ? `${employee.firstName} ${employee.lastName}`
      : row.employeeId,
    formula: formulaText(),
  };
}

export async function listPayroll(user, query = {}) {
  const ids = await accessibleEmployeeIds(user);
  let rows = await postgresPayrollRepo.find((row) =>
    ids.includes(row.employeeId)
  );

  const visibleRows = [];

  for (const row of rows) {
    if (await canViewSalary(user, row.employeeId)) {
      visibleRows.push(row);
    }
  }

  if (query.employeeId) {
    await assertEmployeeAccess(user, query.employeeId);

    if (!(await canViewSalary(user, query.employeeId))) {
      throw forbidden('You cannot view this payroll.');
    }

    rows = visibleRows.filter(
      (row) => row.employeeId === query.employeeId
    );
  } else {
    rows = visibleRows;
  }

  if (query.period) {
    rows = rows.filter((row) => row.period === query.period);
  }

  const result = await Promise.all(rows.map(withName));

  return result.sort((a, b) => b.period.localeCompare(a.period));
}

export async function getPayrollForEmployee(user, employeeId) {
  await assertEmployeeAccess(user, employeeId);

  if (!(await canViewSalary(user, employeeId))) {
    throw forbidden('You cannot view this payroll.');
  }

  const rows = await postgresPayrollRepo.find(
    (row) => row.employeeId === employeeId
  );

  return Promise.all(rows.map(withName));
}

export async function generatePayroll(actor, period) {
  const month = period || new Date().toISOString().slice(0, 7);
  const employees = await postgresEmployeeRepo.all();
  const incentivesList = await postgresIncentiveRepo.all();
  const penaltiesList = await postgresPenaltyRepo.all();

  let count = 0;

  for (const employee of employees) {
    if (employee.employmentStatus !== 'active') continue;

    const existing = await postgresPayrollRepo.findOne(
      (row) =>
        row.employeeId === employee.id &&
        row.period === month
    );

    if (existing?.status === 'paid') continue;

    const incentives = incentivesList
      .filter(
        (item) =>
          item.employeeId === employee.id &&
          item.period === month &&
          item.status === INCENTIVE_STATUS.APPROVED
      )
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const penalties = penaltiesList
      .filter(
        (item) =>
          item.employeeId === employee.id &&
          item.period === month &&
          item.status === 'approved'
      )
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const basic = Number(employee.basicSalary || 0);
    const allowances = Number(employee.allowances || 0);
    const deductions = Math.round(basic * 0.04);

    const payload = {
      employeeId: employee.id,
      period: month,
      basic,
      allowances,
      incentives,
      bonus: 0,
      deductions,
      penalties,
      net: computeNet({
        basic,
        allowances,
        incentives,
        bonus: 0,
        deductions,
        penalties,
      }),
      status: 'processed',
    };

    if (existing) {
      await postgresPayrollRepo.update(existing.id, payload);
    } else {
      await postgresPayrollRepo.insert({
        id: await postgresPayrollRepo.nextId(),
        ...payload,
      });
    }

    count += 1;
  }

  await writeAudit({
    userId: actor.id,
    action: 'payroll.generated',
    module: 'payroll',
    recordId: month,
    meta: { count },
  });

  return {
    period: month,
    count,
    formula: formulaText(),
  };
}

export async function markPaid(actor, id) {
  const row = await postgresPayrollRepo.findById(id);

  if (!row) {
    throw notFound('Payroll record not found.');
  }

  const updated = await postgresPayrollRepo.update(id, {
    status: 'paid',
  });

  await writeAudit({
    userId: actor.id,
    action: 'payroll.changed',
    module: 'payroll',
    recordId: id,
  });

  await notifyEmployee(row.employeeId, {
    title: 'Payslip ready',
    body: `Payroll for ${row.period} has been marked paid.`,
    module: 'payroll',
  });

  return withName(updated);
}
