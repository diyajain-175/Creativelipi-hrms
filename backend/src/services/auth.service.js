import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { postgresUserRepo as userRepo } from '../repositories/postgres/user.repository.js';
import { postgresEmployeeRepo as employeeRepo } from '../repositories/postgres/employee.repository.js';
import { badRequest, unauthorized } from '../utils/errors.js';
import { permissionsFor } from '../config/permissions.js';
import { ROLE_LABELS } from '../config/roles.js';
import { publicEmployee } from './employee.service.js';
import { writeAudit } from './audit.service.js';

export async function login(email, password) {
  const user = await userRepo.findByEmail(email);

  if (!user || !user.isActive) {
    throw unauthorized('Invalid email or password.');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);

  if (!ok) {
    throw unauthorized('Invalid email or password.');
  }

  const token = jwt.sign(
    { sub: user.id },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  const profile = await sessionProfile(user);

  return { token, profile };
}

export async function sessionProfile(user) {
  const employee = await employeeRepo.findById(user.employeeId);

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role],
    employeeId: user.employeeId,
    mustChangePassword: user.mustChangePassword,
    permissions: permissionsFor(user.role),
    employee: employee ? await publicEmployee(employee, user) : null,
  };
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await userRepo.findById(userId);

  if (!user) throw unauthorized();

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!ok) {
    throw badRequest('Current password is incorrect.');
  }

  if (
    newPassword.length < 8 ||
    !/[A-Za-z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword)
  ) {
    throw badRequest(
      'New password must be at least 8 characters and include a letter and a number.'
    );
  }

  if (newPassword === currentPassword) {
    throw badRequest('New password must be different from the current password.');
  }

  await userRepo.update(userId, {
    passwordHash: await bcrypt.hash(newPassword, 10),
    mustChangePassword: false,
  });

  await writeAudit({
    userId,
    action: 'auth.password_changed',
    module: 'auth',
    recordId: userId,
  });
}