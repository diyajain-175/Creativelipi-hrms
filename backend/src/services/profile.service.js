import { getEmployee } from './employee.service.js';
import { listAttendance } from './attendance.service.js';
import { balancesFor, listLeave } from './leave.service.js';
import { getPayrollForEmployee } from './payroll.service.js';
import { listAssets, listRewards, listGrievances, listReimbursements, listLearning, listGoals, listReviews, listPenalties } from './modules.service.js';
import { assetAssignmentRepo, assetRepo } from '../repositories/index.js';
import { canViewSalary } from './scope.service.js';

export function fullProfile(user, employeeId) {
  const employee = getEmployee(user, employeeId);
  const assets = assetAssignmentRepo
    .find((a) => a.employeeId === employeeId && !a.returnedAt)
    .map((a) => ({ ...assetRepo.findById(a.assetId), ...a }));
  const payload = {
    employee,
    attendance: listAttendance(user, { employeeId }).slice(0, 31),
    leave: {
      balances: balancesFor(employeeId),
      requests: listLeave(user, { employeeId }),
    },
    assets,
    rewards: listRewards(user).filter((r) => r.employeeId === employeeId),
    grievances: listGrievances(user).filter((r) => r.employeeId === employeeId),
    reimbursements: listReimbursements(user).filter((r) => r.employeeId === employeeId),
    learning: listLearning(user).filter((r) => r.employeeId === employeeId),
    performance: {
      goals: listGoals(user, employeeId),
      reviews: listReviews(user, employeeId),
    },
  };
  if (canViewSalary(user, employeeId)) {
    payload.payroll = getPayrollForEmployee(user, employeeId);
    payload.penalties = listPenalties(user).filter((p) => p.employeeId === employeeId);
  }
  return payload;
}
