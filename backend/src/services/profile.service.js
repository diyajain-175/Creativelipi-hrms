import { getEmployee } from './employee.service.js';
import { listAttendance } from './attendance.service.js';
import { balancesFor, listLeave } from './leave.service.js';
import { getPayrollForEmployee } from './payroll.service.js';

import {
  listAssets,
  listRewards,
  listGrievances,
  listReimbursements,
  listLearning,
  listGoals,
  listReviews,
  listPenalties,
} from './modules.service.js';

import { canViewSalary } from './scope.service.js';

export async function fullProfile(user, employeeId) {
  const employee = await getEmployee(user, employeeId);

  const [
    attendance,
    balances,
    leaves,
    assets,
    rewards,
    grievances,
    reimbursements,
    learning,
    goals,
    reviews,
  ] = await Promise.all([
    listAttendance(user, { employeeId }),
    balancesFor(employeeId),
    listLeave(user, { employeeId }),
    listAssets(user),
    listRewards(user),
    listGrievances(user),
    listReimbursements(user),
    listLearning(user),
    listGoals(user, employeeId),
    listReviews(user, employeeId),
  ]);

  const payload = {
    employee,
    attendance: attendance.slice(0, 31),
    leave: {
      balances,
      requests: leaves.filter(
        (item) => item.employeeId === employeeId
      ),
    },
    assets: assets.filter(
      (item) => item.assignedEmployeeId === employeeId
    ),
    rewards: rewards.filter(
      (item) => item.employeeId === employeeId
    ),
    grievances: grievances.filter(
      (item) => item.employeeId === employeeId
    ),
    reimbursements: reimbursements.filter(
      (item) => item.employeeId === employeeId
    ),
    learning: learning.filter(
      (item) => item.employeeId === employeeId
    ),
    performance: {
      goals,
      reviews,
    },
  };

  if (await canViewSalary(user, employeeId)) {
    const [payroll, penalties] = await Promise.all([
      getPayrollForEmployee(user, employeeId),
      listPenalties(user),
    ]);

    payload.payroll = payroll;
    payload.penalties = penalties.filter(
      (item) => item.employeeId === employeeId
    );
  }

  return payload;
}