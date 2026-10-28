import { ROLES } from '../config/roles.js';
import { employeeRepo, leaveRepo, grievanceRepo } from '../repositories/index.js';
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
import { LEAVE_STATUS } from '../config/workflows.js';
import { todayIso } from '../utils/ids.js';

export function buildDashboard(user) {
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

function employeeDashboard(user) {
  const me = employeeRepo.findById(user.employeeId);
  const payroll = listPayroll(user);

  return {
    kind: 'employee',
    welcome: `Good to see you, ${me.firstName}.`,
    profile: publicEmployee(me, user),
    attendance: todayAttendance(user.employeeId),
    leaveBalances: balancesFor(user.employeeId),
    pendingLeave: listLeave(user).filter(
      (l) =>
        l.status.startsWith('pending') &&
        l.employeeId === user.employeeId
    ),
    payrollSummary: payroll[0] || null,
    assets: listAssets(user),
    reimbursements: listReimbursements(user).slice(0, 5),
    grievances: listGrievances(user).slice(0, 5),
    rewards: listRewards(user).slice(0, 5),
    learning: listLearning(user),
    notifications: listNotifications(user.id).slice(0, 6),
  };
}

function teamStats(user) {
  const accessibleIds = accessibleEmployeeIds(user);
  const ids = Array.isArray(accessibleIds) ? accessibleIds : [];

  const teamIds = ids.filter((id) => id !== user.employeeId);
  const people = teamIds
    .map((id) => employeeRepo.findById(id))
    .filter(Boolean);

  const today = todayIso();
  const att = listAttendance(user, { from: today, to: today });

  const present = att.filter((a) =>
    ['present', 'late'].includes(a.status)
  ).length;

  const onLeave = att.filter((a) => a.status === 'leave').length;
  const absent = Math.max(0, people.length - present - onLeave);

  return {
    people,
    present,
    absent,
    onLeave,
  };
}

function teamLeaderDashboard(user) {
  const { people, present, absent, onLeave } = teamStats(user);

  return {
    kind: 'team_leader',
    welcome: 'Your team for today',
    teamSize: people.length,
    present,
    absent,
    onLeave,
    pendingLeave: listLeave(user).filter(
      (l) => l.status === LEAVE_STATUS.PENDING_TL
    ),
    incentives: listIncentives(user),
    grievances: listGrievances(user),
    people: people.map((p) => publicEmployee(p, user)),
  };
}

function processManagerDashboard(user) {
  const { people, present, absent, onLeave } = teamStats(user);

  return {
    kind: 'process_manager',
    welcome: 'Process overview',
    employeeCount: people.length,
    present,
    absent,
    onLeave,
    pendingLeave: listLeave(user).filter(
      (l) => l.status === LEAVE_STATUS.PENDING_PM
    ),
    pendingIncentives: listIncentives(user).filter(
      (i) => i.status.includes('pending')
    ),
    reimbursements: listReimbursements(user).filter(
      (r) => r.status.startsWith('pending')
    ),
    people: people.map((p) => publicEmployee(p, user)),
  };
}

function hrDashboard(user) {
  const all = employeeRepo.all();

  return {
    kind: 'hr_admin',
    welcome: 'CreativeLipi people operations',
    totalEmployees: all.length,
    active: all.filter((e) => e.employmentStatus === 'active').length,
    newEmployees: all.filter(
      (e) => (e.joiningDate || '').startsWith('2026-10')
    ).length,
    pendingLeave: leaveRepo
      .all()
      .filter((l) => l.status.startsWith('pending')).length,
    grievances: grievanceRepo
      .all()
      .filter((g) => g.status !== 'resolved').length,
    learning: listLearning(user).length,
    rewards: listRewards(user).length,
    payrollOpen: listPayroll(user).filter(
      (p) => p.status !== 'paid'
    ).length,
  };
}

function financeDashboard(user) {
  const reimbursements = listReimbursements(user);

  return {
    kind: 'finance',
    welcome: 'Payroll and reimbursements',
    payroll: listPayroll(user).slice(0, 12),
    reimbursements,
    pendingReimbursements: reimbursements.filter(
      (r) => r.status === 'pending_finance'
    ).length,
  };
}

function itDashboard(user) {
  return {
    kind: 'it_admin',
    welcome: 'Asset desk',
    assets: listAssets(user),
    pendingRequests: listAssetRequests(user).filter(
      (r) => r.status === 'pending_it'
    ),
  };
}