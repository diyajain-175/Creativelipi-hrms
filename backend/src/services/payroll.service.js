import { payrollRepo, incentiveRepo, penaltyRepo, employeeRepo, getSettings } from '../repositories/index.js';
import { accessibleEmployeeIds, assertEmployeeAccess, canViewSalary } from './scope.service.js';
import { forbidden, notFound } from '../utils/errors.js';
import { nextId, nowIso } from '../utils/ids.js';
import { writeAudit } from './audit.service.js';
import { notifyEmployee } from './notification.service.js';
import { INCENTIVE_STATUS } from '../config/workflows.js';

export function computeNet({ basic, allowances, incentives, bonus, deductions, penalties }) {
  return Number(basic) + Number(allowances) + Number(incentives) + Number(bonus) - Number(deductions) - Number(penalties);
}

export function formulaText() {
  return getSettings().payrollFormula.net;
}

function withName(row) {
  const e = employeeRepo.findById(row.employeeId);
  return {
    ...row,
    employeeName: e ? `${e.firstName} ${e.lastName}` : row.employeeId,
    formula: formulaText(),
  };
}

export function listPayroll(user, query = {}) {
  if (!canViewSalary(user, user.employeeId) && user.role !== 'process_manager') {
    return payrollRepo.find((r) => r.employeeId === user.employeeId).map(withName);
  }
  const accessibleIds = accessibleEmployeeIds(user);
  const ids = Array.isArray(accessibleIds) ? accessibleIds : [];
  
  let rows = payrollRepo.find((r) => ids.includes(r.employeeId));
  if (query.employeeId) {
    assertEmployeeAccess(user, query.employeeId);
    if (!canViewSalary(user, query.employeeId) && query.employeeId !== user.employeeId) throw forbidden();
    rows = rows.filter((r) => r.employeeId === query.employeeId);
  }
  if (query.period) rows = rows.filter((r) => r.period === query.period);
  return rows.map(withName).sort((a, b) => b.period.localeCompare(a.period));
}

export function getPayrollForEmployee(user, employeeId) {
  assertEmployeeAccess(user, employeeId);
  if (!canViewSalary(user, employeeId)) throw forbidden('You cannot view this payroll.');
  return payrollRepo.find((r) => r.employeeId === employeeId).map(withName);
}

export function generatePayroll(actor, period) {
  const month = period || nowIso().slice(0, 7);
  const created = [];
  for (const emp of employeeRepo.all().filter((e) => e.employmentStatus === 'active')) {
    const existing = payrollRepo.findOne((r) => r.employeeId === emp.id && r.period === month);
    if (existing && existing.status === 'paid') continue;
    const incentives = incentiveRepo
      .find((i) => i.employeeId === emp.id && i.period === month && i.status === INCENTIVE_STATUS.APPROVED)
      .reduce((sum, i) => sum + Number(i.amount), 0);
    const penalties = penaltyRepo
      .find((p) => p.employeeId === emp.id && p.period === month && p.status === 'approved')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const deductions = Math.round(emp.basicSalary * 0.04);
    const payload = {
      employeeId: emp.id,
      period: month,
      basic: emp.basicSalary,
      allowances: emp.allowances,
      incentives,
      bonus: 0,
      deductions,
      penalties,
      net: computeNet({
        basic: emp.basicSalary,
        allowances: emp.allowances,
        incentives,
        bonus: 0,
        deductions,
        penalties,
      }),
      status: 'processed',
      createdAt: nowIso(),
    };
    if (existing) created.push(payrollRepo.update(existing.id, payload));
    else created.push(payrollRepo.insert({ id: nextId('PAY', payrollRepo.all()), ...payload }));
  }
  writeAudit({ userId: actor.id, action: 'payroll.generated', module: 'payroll', recordId: month, meta: { count: created.length } });
  return { period: month, count: created.length, formula: formulaText() };
}

export function markPaid(actor, id) {
  const row = payrollRepo.findById(id);
  if (!row) throw notFound('Payroll record not found.');
  const updated = payrollRepo.update(id, { status: 'paid' });
  writeAudit({ userId: actor.id, action: 'payroll.changed', module: 'payroll', recordId: id });
  notifyEmployee(row.employeeId, {
    title: 'Payslip ready',
    body: `Payroll for ${row.period} has been marked paid.`,
    module: 'payroll',
  });
  return withName(updated);
}
