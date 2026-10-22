import { employeeRepo, departmentRepo, designationRepo, userRepo } from '../repositories/index.js';
import { accessibleEmployeeIds, canViewSalary, assertEmployeeAccess } from './scope.service.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { requireFields } from '../middleware/validate.js';
import { writeAudit } from './audit.service.js';
import { ALL_ROLES } from '../config/roles.js';
import bcrypt from 'bcryptjs';
import { nextId, nowIso } from '../utils/ids.js';

export function publicEmployee(employee, user) {
  const department = departmentRepo.findById(employee.departmentId);
  const designation = designationRepo.findById(employee.designationId);
  const teamLeader = employee.teamLeaderId ? employeeRepo.findById(employee.teamLeaderId) : null;
  const processManager = employee.processManagerId ? employeeRepo.findById(employee.processManagerId) : null;
  const base = {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    fullName: `${employee.firstName} ${employee.lastName}`,
    email: employee.email,
    phone: employee.phone,
    departmentId: employee.departmentId,
    department: department?.name || null,
    designationId: employee.designationId,
    designation: designation?.name || null,
    role: employee.role,
    teamLeaderId: employee.teamLeaderId,
    teamLeader: teamLeader ? `${teamLeader.firstName} ${teamLeader.lastName}` : null,
    processManagerId: employee.processManagerId,
    processManager: processManager ? `${processManager.firstName} ${processManager.lastName}` : null,
    joiningDate: employee.joiningDate,
    location: employee.location,
    employmentStatus: employee.employmentStatus,
    documents: employee.documents || [],
  };
  if (canViewSalary(user, employee.id)) {
    base.salary = {
      basicSalary: employee.basicSalary,
      allowances: employee.allowances,
    };
    base.bank = {
      bankName: employee.bankName,
      bankAccount: employee.bankAccount,
      ifsc: employee.ifsc,
    };
  }
  return base;
}

export function listEmployees(user, query = {}) {
  let rows = employeeRepo.all().filter((e) => accessibleEmployeeIds(user).includes(e.id));
  if (query.q) {
    const q = query.q.toLowerCase();
    rows = rows.filter((e) =>
      `${e.firstName} ${e.lastName} ${e.email} ${e.employeeCode} ${e.id}`.toLowerCase().includes(q)
    );
  }
  if (query.departmentId) rows = rows.filter((e) => e.departmentId === query.departmentId);
  if (query.status) rows = rows.filter((e) => e.employmentStatus === query.status);
  return rows.map((e) => publicEmployee(e, user));
}

export function getEmployee(user, id) {
  const employee = assertEmployeeAccess(user, id);
  return publicEmployee(employee, user);
}

export function createEmployee(actor, body) {
  requireFields(body, ['firstName', 'lastName', 'email', 'role', 'departmentId', 'designationId']);
  if (!ALL_ROLES.includes(body.role)) throw badRequest('Invalid role.');
  if (employeeRepo.findOne((e) => e.email === body.email)) throw conflict('Email already exists.');
  const id = nextId('EMP', employeeRepo.all());
  const code = `CL-${id.slice(4)}`;
  const employee = employeeRepo.insert({
    id,
    employeeCode: code,
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
    email: body.email.trim().toLowerCase(),
    phone: body.phone || '',
    departmentId: body.departmentId,
    designationId: body.designationId,
    role: body.role,
    teamLeaderId: body.teamLeaderId || null,
    processManagerId: body.processManagerId || null,
    joiningDate: body.joiningDate || nowIso().slice(0, 10),
    location: body.location || 'Pune',
    employmentStatus: 'active',
    basicSalary: Number(body.basicSalary || 0),
    allowances: Number(body.allowances || 0),
    bankName: body.bankName || '',
    bankAccount: body.bankAccount || '',
    ifsc: body.ifsc || '',
    documents: [],
  });
  userRepo.insert({
    id: `USR-${id.slice(4)}`,
    email: employee.email,
    passwordHash: bcrypt.hashSync(body.password || 'password123', 10),
    role: employee.role,
    employeeId: employee.id,
    isActive: true,
  });
  writeAudit({
    userId: actor.id,
    action: 'employee.created',
    module: 'employees',
    recordId: employee.id,
  });
  return publicEmployee(employee, actor);
}

export function updateEmployee(actor, id, body) {
  const existing = employeeRepo.findById(id);
  if (!existing) throw notFound('Employee not found.');
  const patch = {};
  const fields = [
    'firstName',
    'lastName',
    'phone',
    'departmentId',
    'designationId',
    'teamLeaderId',
    'processManagerId',
    'joiningDate',
    'location',
    'employmentStatus',
    'basicSalary',
    'allowances',
    'bankName',
    'bankAccount',
    'ifsc',
  ];
  for (const field of fields) {
    if (body[field] !== undefined) patch[field] = body[field];
  }
  if (body.role) {
    if (!ALL_ROLES.includes(body.role)) throw badRequest('Invalid role.');
    patch.role = body.role;
    const login = userRepo.findByEmployeeId(id);
    if (login) userRepo.update(login.id, { role: body.role });
    writeAudit({
      userId: actor.id,
      action: 'employee.role_changed',
      module: 'employees',
      recordId: id,
      meta: { from: existing.role, to: body.role },
    });
  }
  if (body.employmentStatus === 'inactive') {
    const login = userRepo.findByEmployeeId(id);
    if (login) userRepo.update(login.id, { isActive: false });
  }
  const updated = employeeRepo.update(id, patch);
  writeAudit({
    userId: actor.id,
    action: 'employee.updated',
    module: 'employees',
    recordId: id,
  });
  return publicEmployee(updated, actor);
}
