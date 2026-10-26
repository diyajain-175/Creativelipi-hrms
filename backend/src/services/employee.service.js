import {
  postgresEmployeeRepo,
} from '../repositories/postgres/employee.repository.js';

import {
  postgresUserRepo,
} from '../repositories/postgres/user.repository.js';

import {
  accessibleEmployeeIds,
  canViewSalary,
  assertEmployeeAccess,
} from './scope.service.js';

import {
  badRequest,
  conflict,
  notFound,
} from '../utils/errors.js';

import { requireFields } from '../middleware/validate.js';
import { writeAudit } from './audit.service.js';
import { ALL_ROLES } from '../config/roles.js';

import bcrypt from 'bcryptjs';
import { nowIso } from '../utils/ids.js';

export async function publicEmployee(employee, user) {
  const teamLeader = employee.teamLeaderId
    ? await postgresEmployeeRepo.findById(employee.teamLeaderId)
    : null;

  const processManager = employee.processManagerId
    ? await postgresEmployeeRepo.findById(employee.processManagerId)
    : null;

  const base = {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    fullName: `${employee.firstName} ${employee.lastName}`,
    email: employee.email,
    phone: employee.phone,

    departmentId: employee.departmentId,
    designationId: employee.designationId,

    role: employee.role,

    teamLeaderId: employee.teamLeaderId,
    teamLeader: teamLeader
      ? `${teamLeader.firstName} ${teamLeader.lastName}`
      : null,

    processManagerId: employee.processManagerId,
    processManager: processManager
      ? `${processManager.firstName} ${processManager.lastName}`
      : null,

    joiningDate: employee.joiningDate,
    location: employee.location,
    employmentStatus: employee.employmentStatus,
    documents: employee.documents || [],
  };

  if (await canViewSalary(user, employee.id)) {
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

export async function listEmployees(user, query = {}) {
  const allowedIds = await accessibleEmployeeIds(user);

  let rows = await postgresEmployeeRepo.all();

  rows = rows.filter((employee) =>
    allowedIds.includes(employee.id)
  );

  if (query.q) {
    const q = String(query.q).toLowerCase();

    rows = rows.filter((employee) =>
      `${employee.firstName} ${employee.lastName} ${employee.email} ${employee.employeeCode} ${employee.id}`
        .toLowerCase()
        .includes(q)
    );
  }

  if (query.departmentId) {
    rows = rows.filter(
      (employee) => employee.departmentId === query.departmentId
    );
  }

  if (query.status) {
    rows = rows.filter(
      (employee) => employee.employmentStatus === query.status
    );
  }

  const result = [];

  for (const employee of rows) {
    result.push(await publicEmployee(employee, user));
  }

  return result;
}

export async function getEmployee(user, id) {
  const employee = await assertEmployeeAccess(user, id);

  return publicEmployee(employee, user);
}

export async function createEmployee(actor, body) {
  requireFields(body, [
    'firstName',
    'lastName',
    'email',
    'role',
    'departmentId',
    'designationId',
  ]);

  if (!ALL_ROLES.includes(body.role)) {
    throw badRequest('Invalid role.');
  }

  const email = body.email.trim().toLowerCase();

  const existing = await postgresEmployeeRepo.findByEmail(email);

  if (existing) {
    throw conflict('Email already exists.');
  }

  const id = await postgresEmployeeRepo.nextId();

  const employee = await postgresEmployeeRepo.insert({
    id,
    employeeCode: `CL-${id.slice(4)}`,

    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),

    email,
    phone: body.phone || '',

    departmentId: body.departmentId,
    designationId: body.designationId,

    role: body.role,

    teamLeaderId: body.teamLeaderId || null,
    processManagerId: body.processManagerId || null,

    joiningDate:
      body.joiningDate || nowIso().slice(0, 10),

    location: body.location || 'Pune',

    employmentStatus: 'active',

    basicSalary: Number(body.basicSalary || 0),
    allowances: Number(body.allowances || 0),

    bankName: body.bankName || '',
    bankAccount: body.bankAccount || '',
    ifsc: body.ifsc || '',

    documents: [],
  });

  await postgresUserRepo.insert({
    id: `USR-${id.slice(4)}`,
    email: employee.email,
    passwordHash: bcrypt.hashSync(
      body.password || 'password123',
      10
    ),
    role: employee.role,
    employeeId: employee.id,
    isActive: true,
  });

  await writeAudit({
    userId: actor.id,
    action: 'employee.created',
    module: 'employees',
    recordId: employee.id,
  });

  return publicEmployee(employee, actor);
}

export async function updateEmployee(actor, id, body) {
  const existing = await postgresEmployeeRepo.findById(id);

  if (!existing) {
    throw notFound('Employee not found.');
  }

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
    if (body[field] !== undefined) {
      patch[field] = body[field];
    }
  }

  if (body.role) {
    if (!ALL_ROLES.includes(body.role)) {
      throw badRequest('Invalid role.');
    }

    patch.role = body.role;

    const login = await postgresUserRepo.findByEmployeeId(id);

    if (login) {
      await postgresUserRepo.update(login.id, {
        role: body.role,
      });
    }

    await writeAudit({
      userId: actor.id,
      action: 'employee.role_changed',
      module: 'employees',
      recordId: id,
      meta: {
        from: existing.role,
        to: body.role,
      },
    });
  }

  if (body.employmentStatus === 'inactive') {
    const login = await postgresUserRepo.findByEmployeeId(id);

    if (login) {
      await postgresUserRepo.update(login.id, {
        isActive: false,
      });
    }
  }

  const updated = await postgresEmployeeRepo.update(
    id,
    patch
  );

  await writeAudit({
    userId: actor.id,
    action: 'employee.updated',
    module: 'employees',
    recordId: id,
  });

  return publicEmployee(updated, actor);
}