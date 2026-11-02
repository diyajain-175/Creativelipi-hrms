import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { postgresUserRepo as userRepo } from '../repositories/postgres/user.repository.js';
import { postgresEmployeeRepo as employeeRepo } from '../repositories/postgres/employee.repository.js';
import { unauthorized } from '../utils/errors.js';
import { permissionsFor } from '../config/permissions.js';
import { ROLE_LABELS } from '../config/roles.js';
import { publicEmployee } from './employee.service.js';

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
    permissions: permissionsFor(user.role),
    employee: employee ? await publicEmployee(employee, user) : null,
  };
}