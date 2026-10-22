import { ROLES } from '../config/roles.js';
import { PERMISSIONS, hasPermission } from '../config/permissions.js';
import { employeeRepo } from '../repositories/index.js';
import { forbidden, notFound } from '../utils/errors.js';

export function accessibleEmployeeIds(user) {
  const all = employeeRepo.all();
  if (hasPermission(user.role, PERMISSIONS.EMPLOYEES_READ_ALL)) {
    return all.map((e) => e.id);
  }
  if (hasPermission(user.role, PERMISSIONS.EMPLOYEES_READ_PROCESS)) {
    return all
      .filter((e) => e.id === user.employeeId || e.processManagerId === user.employeeId)
      .map((e) => e.id);
  }
  if (hasPermission(user.role, PERMISSIONS.EMPLOYEES_READ_TEAM)) {
    return all
      .filter((e) => e.id === user.employeeId || e.teamLeaderId === user.employeeId)
      .map((e) => e.id);
  }
  return [user.employeeId];
}

export function canAccessEmployee(user, employeeId) {
  return accessibleEmployeeIds(user).includes(employeeId);
}

export function assertEmployeeAccess(user, employeeId) {
  const employee = employeeRepo.findById(employeeId);
  if (!employee) throw notFound('Employee not found.');
  if (!canAccessEmployee(user, employeeId)) {
    throw forbidden('You cannot view this employee.');
  }
  return employee;
}

export function canViewSalary(user, employeeId) {
  if (user.employeeId === employeeId) return true;
  if (user.role === ROLES.HR_ADMIN || user.role === ROLES.FINANCE) return true;
  if (user.role === ROLES.PROCESS_MANAGER) return canAccessEmployee(user, employeeId);
  return false;
}
