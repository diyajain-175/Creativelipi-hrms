import { ROLES } from '../config/roles.js';
import { conflict, forbidden } from '../utils/errors.js';

export function nextStatusAfterApproval({ user, employee, status, chain, done }) {
  const index = chain.findIndex((stage) => stage.status === status);

  if (index === -1) {
    throw conflict('This request is already decided.');
  }

  if (employee.id === user.employeeId) {
    throw forbidden('You cannot approve your own request.');
  }

  const stageOf = (role) => chain.findIndex((stage) => stage.role === role);

  let target = stageOf(user.role);

  if (user.role === ROLES.HR_ADMIN && target === -1) {
    target = stageOf(ROLES.PROCESS_MANAGER);
  }

  if (target === -1) {
    throw forbidden();
  }

  const canReachBack = [ROLES.PROCESS_MANAGER, ROLES.HR_ADMIN].includes(user.role);
  const waitingForUser = canReachBack ? index <= target : index === target;

  if (!waitingForUser) {
    throw conflict('This request is not waiting for you.');
  }

  if (
    user.role === ROLES.TEAM_LEADER &&
    employee.teamLeaderId !== user.employeeId
  ) {
    throw forbidden();
  }

  if (
    user.role === ROLES.PROCESS_MANAGER &&
    employee.processManagerId !== user.employeeId
  ) {
    throw forbidden();
  }

  return chain[target + 1]?.status || done;
}