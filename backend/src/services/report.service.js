import { listEmployees } from './employee.service.js';
import { listAttendance } from './attendance.service.js';
import { listLeave } from './leave.service.js';
import { listPayroll } from './payroll.service.js';
import { listIncentives, listAssets, listReimbursements, listGrievances, listReviews } from './modules.service.js';
import { badRequest } from '../utils/errors.js';

const builders = {
  employees: (user, q) => listEmployees(user, q),
  attendance: (user, q) => listAttendance(user, q),
  leave: (user, q) => listLeave(user, q),
  payroll: (user, q) => listPayroll(user, q),
  incentives: (user) => listIncentives(user),
  performance: (user, q) => listReviews(user, q.employeeId),
  assets: (user) => listAssets(user),
  reimbursements: (user) => listReimbursements(user),
  grievances: (user) => listGrievances(user),
};

export function runReport(user, type, query) {
  const build = builders[type];
  if (!build) throw badRequest('Unknown report type.');
  return build(user, query);
}

export function toCsv(rows) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== 'object');
  const header = keys.join(',');
  const lines = rows.map((row) =>
    keys.map((k) => `"${String(row[k] ?? '').replaceAll('"', '""')}"`).join(',')
  );
  return [header, ...lines].join('\n');
}
