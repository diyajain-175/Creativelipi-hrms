import { listEmployees } from './employee.service.js';
import { listAttendance } from './attendance.service.js';
import { listLeave } from './leave.service.js';
import { listPayroll } from './payroll.service.js';

import {
  listIncentives,
  listAssets,
  listReimbursements,
  listGrievances,
  listReviews,
} from './modules.service.js';

import { badRequest } from '../utils/errors.js';

const reportBuilders = {
  employees: (user, query) => listEmployees(user, query),
  attendance: (user, query) => listAttendance(user, query),
  leave: (user, query) => listLeave(user, query),
  payroll: (user, query) => listPayroll(user, query),
  incentives: (user) => listIncentives(user),
  performance: (user, query) =>
    listReviews(user, query?.employeeId),
  assets: (user) => listAssets(user),
  reimbursements: (user) => listReimbursements(user),
  grievances: (user) => listGrievances(user),
};

export async function runReport(user, type, query = {}) {
  const buildReport = reportBuilders[type];

  if (!buildReport) {
    throw badRequest('Unknown report type.');
  }

  return await buildReport(user, query);
}

export function toCsv(rows = []) {
  if (!rows.length) return '';

  const columns = Object.keys(rows[0]).filter(
    (key) =>
      rows[0][key] === null ||
      typeof rows[0][key] !== 'object'
  );

  const header = columns.join(',');

  const lines = rows.map((row) =>
    columns
      .map((key) => {
        const value = String(row[key] ?? '').replaceAll('"', '""');
        return `"${value}"`;
      })
      .join(',')
  );

  return [header, ...lines].join('\n');
}