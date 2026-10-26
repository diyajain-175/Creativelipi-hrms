import { ROLES } from '../config/roles.js';
import { PERMISSIONS, hasPermission } from '../config/permissions.js';
import { postgresEmployeeRepo } from '../repositories/postgres/employee.repository.js';
import { forbidden, notFound } from '../utils/errors.js';

export async function accessibleEmployeeIds(user) {
  const all = await postgresEmployeeRepo.all();

  if (hasPermission(user.role, PERMISSIONS.EMPLOYEES_READ_ALL)) {
    return all.map((e) => e.id);
  }

  if (hasPermission(user.role, PERMISSIONS.EMPLOYEES_READ_PROCESS)) {
    return all
      .filter(
        (e) =>
          e.id === user.employeeId ||
          e.processManagerId === user.employeeId
      )
      .map((e) => e.id);
  }

  if (hasPermission(user.role, PERMISSIONS.EMPLOYEES_READ_TEAM)) {
    return all
      .filter(
        (e) =>
          e.id === user.employeeId ||
          e.teamLeaderId === user.employeeId
      )
      .map((e) => e.id);
  }

  return [user.employeeId];
}

export async function canAccessEmployee(user, employeeId) {
  const ids = await accessibleEmployeeIds(user);
  return ids.includes(employeeId);
}

export async function assertEmployeeAccess(user, employeeId) {
  const employee = await postgresEmployeeRepo.findById(employeeId);

  if (!employee) {
    throw notFound('Employee not found.');
  }

  if (!(await canAccessEmployee(user, employeeId))) {
    throw forbidden('You cannot view this employee.');
  }

  return employee;
}

export async function canViewSalary(user, employeeId) {
  if (user.employeeId === employeeId) return true;

  if (
    user.role === ROLES.HR_ADMIN ||
    user.role === ROLES.FINANCE
  ) {
    return true;
  }

  if (user.role === ROLES.PROCESS_MANAGER) {
    return canAccessEmployee(user, employeeId);
  }

  return false;
}