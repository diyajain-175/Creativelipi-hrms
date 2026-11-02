import { ROLES } from '../config/roles.js';
import { LEAVE_STATUS } from '../config/workflows.js';
import { todayIso } from '../utils/ids.js';

import { postgresEmployeeRepo } from '../repositories/postgres/employee.repository.js';
import { postgresLeaveRepo } from '../repositories/postgres/leave.repository.js';
import { postgresGrievanceRepo } from '../repositories/postgres/grievance.repository.js';

import { accessibleEmployeeIds } from './scope.service.js';
import { publicEmployee } from './employee.service.js';
import { todayAttendance, listAttendance } from './attendance.service.js';
import { balancesFor, listLeave } from './leave.service.js';
import { listPayroll } from './payroll.service.js';

import {
  listAssets,
  listRewards,
  listLearning,
  listGrievances,
  listReimbursements,
  listIncentives,
  listAssetRequests,
} from './modules.service.js';

import { listNotifications } from './notification.service.js';

export async function buildDashboard(user) {
  switch (user.role) {
    case ROLES.TEAM_LEADER:
      return teamLeaderDashboard(user);

    case ROLES.PROCESS_MANAGER:
      return processManagerDashboard(user);

    case ROLES.HR_ADMIN:
      return hrDashboard(user);

    case ROLES.FINANCE:
      return financeDashboard(user);

    case ROLES.IT_ADMIN:
      return itDashboard(user);

    default:
      return employeeDashboard(user);
  }
}

async function employeeDashboard(user) {
  const me = await postgresEmployeeRepo.findById(user.employeeId);

  if (!me) {
    throw new Error('Employee profile not found.');
  }

  const [
    payroll,
    attendance,
    leaveBalances,
    leaves,
    assets,
    reimbursements,
    grievances,
    rewards,
    learning,
    notifications,
    profile,
  ] = await Promise.all([
    listPayroll(user),
    todayAttendance(user.employeeId),
    balancesFor(user.employeeId),
    listLeave(user),
    listAssets(user),
    listReimbursements(user),
    listGrievances(user),
    listRewards(user),
    listLearning(user),
    listNotifications(user.id),
    publicEmployee(me, user),
  ]);

  return {
    kind: 'employee',
    welcome: `Good to see you, ${me.firstName}.`,
    profile,
    attendance,
    leaveBalances,
    pendingLeave: leaves.filter(
      (leave) =>
        leave.employeeId === user.employeeId &&
        leave.status.startsWith('pending')
    ),
    payrollSummary: payroll[0] || null,
    assets,
    reimbursements: reimbursements.slice(0, 5),
    grievances: grievances.slice(0, 5),
    rewards: rewards.slice(0, 5),
    learning,
    notifications: notifications.slice(0, 6),
  };
}

async function teamStats(user) {
  const ids = await accessibleEmployeeIds(user);
  const teamIds = ids.filter((id) => id !== user.employeeId);

  const allEmployees = await postgresEmployeeRepo.all();

  const people = allEmployees.filter((employee) =>
    teamIds.includes(employee.id)
  );

  const today = todayIso();
  const attendance = await listAttendance(user, {
    from: today,
    to: today,
  });

  const present = attendance.filter((item) =>
    ['present', 'late'].includes(item.status)
  ).length;

  const onLeave = attendance.filter(
    (item) => item.status === 'leave'
  ).length;

  const absent = Math.max(
    0,
    people.length - present - onLeave
  );

  return {
    people,
    present,
    absent,
    onLeave,
  };
}

async function teamLeaderDashboard(user) {
  const [
    stats,
    leaves,
    incentives,
    grievances,
  ] = await Promise.all([
    teamStats(user),
    listLeave(user),
    listIncentives(user),
    listGrievances(user),
  ]);

  return {
    kind: 'team_leader',
    welcome: 'Your team for today',
    teamSize: stats.people.length,
    present: stats.present,
    absent: stats.absent,
    onLeave: stats.onLeave,
    pendingLeave: leaves.filter(
      (leave) => leave.status === LEAVE_STATUS.PENDING_TL
    ),
    incentives,
    grievances,
    people: await Promise.all(
      stats.people.map((employee) => publicEmployee(employee, user))
    ),
  };
}

async function processManagerDashboard(user) {
  const [
    stats,
    leaves,
    incentives,
    reimbursements,
  ] = await Promise.all([
    teamStats(user),
    listLeave(user),
    listIncentives(user),
    listReimbursements(user),
  ]);

  return {
    kind: 'process_manager',
    welcome: 'Process overview',
    employeeCount: stats.people.length,
    present: stats.present,
    absent: stats.absent,
    onLeave: stats.onLeave,
    pendingLeave: leaves.filter(
      (leave) => leave.status === LEAVE_STATUS.PENDING_PM
    ),
    pendingIncentives: incentives.filter(
      (item) => item.status.includes('pending')
    ),
    reimbursements: reimbursements.filter(
      (item) => item.status.startsWith('pending')
    ),
    people: await Promise.all(
      stats.people.map((employee) => publicEmployee(employee, user))
    ),
  };
}

async function hrDashboard(user) {
  const [
    employees,
    leaves,
    grievances,
    learning,
    rewards,
    payroll,
  ] = await Promise.all([
    postgresEmployeeRepo.all(),
    postgresLeaveRepo.all(),
    postgresGrievanceRepo.all(),
    listLearning(user),
    listRewards(user),
    listPayroll(user),
  ]);

  const month = todayIso().slice(0, 7);

  return {
    kind: 'hr_admin',
    welcome: 'CreativeLipi people operations',
    totalEmployees: employees.length,
    active: employees.filter(
      (employee) => employee.employmentStatus === 'active'
    ).length,
    newEmployees: employees.filter(
      (employee) => (employee.joiningDate || '').startsWith(month)
    ).length,
    pendingLeave: leaves.filter(
      (leave) => leave.status.startsWith('pending')
    ).length,
    grievances: grievances.filter(
      (grievance) => grievance.status !== 'resolved'
    ).length,
    learning: learning.length,
    rewards: rewards.length,
    payrollOpen: payroll.filter(
      (item) => item.status !== 'paid'
    ).length,
  };
}

async function financeDashboard(user) {
  const [reimbursements, payroll] = await Promise.all([
    listReimbursements(user),
    listPayroll(user),
  ]);

  return {
    kind: 'finance',
    welcome: 'Payroll and reimbursements',
    payroll: payroll.slice(0, 12),
    reimbursements,
    pendingReimbursements: reimbursements.filter(
      (item) => item.status === 'pending_finance'
    ).length,
  };
}

async function itDashboard(user) {
  const [assets, requests] = await Promise.all([
    listAssets(user),
    listAssetRequests(user),
  ]);

  return {
    kind: 'it_admin',
    welcome: 'Asset desk',
    assets,
    pendingRequests: requests.filter(
      (request) => request.status === 'pending_it'
    ),
  };
}