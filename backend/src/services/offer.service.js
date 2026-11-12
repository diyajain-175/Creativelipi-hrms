import { postgresOfferRepo } from '../repositories/postgres/offer.repository.js';
import { postgresEmployeeRepo } from '../repositories/postgres/employee.repository.js';
import { postgresDepartmentRepo } from '../repositories/postgres/department.repository.js';
import { postgresDesignationRepo } from '../repositories/postgres/designation.repository.js';
import { ROLES } from '../config/roles.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js';
import { requireFields } from '../middleware/validate.js';
import { writeAudit } from './audit.service.js';
import { buildOfferLetter } from './offerLetterPdf.service.js';
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { postgresUserRepo } from '../repositories/postgres/user.repository.js';

const OFFER_ROLES = [
  ROLES.EMPLOYEE,
  ROLES.TEAM_LEADER,
  ROLES.PROCESS_MANAGER,
  ROLES.FINANCE,
  ROLES.IT_ADMIN,
];

const fullName = (employee) =>
  employee ? `${employee.firstName} ${employee.lastName}`.trim() : '';

async function decorate(offers) {
  const [departments, designations, employees] = await Promise.all([
    postgresDepartmentRepo.all(),
    postgresDesignationRepo.all(),
    postgresEmployeeRepo.all(),
  ]);

  return offers.map((offer) => ({
    ...offer,
    departmentName: departments.find((d) => d.id === offer.departmentId)?.name || '',
    designationName: designations.find((d) => d.id === offer.designationId)?.name || '',
    teamLeaderName: fullName(employees.find((e) => e.id === offer.teamLeaderId)),
    processManagerName: fullName(employees.find((e) => e.id === offer.processManagerId)),
  }));
}

export async function listOffers(user) {
  if (user.role !== ROLES.HR_ADMIN) throw forbidden();

  return decorate(await postgresOfferRepo.all());
}

export async function createOffer(user, body) {
  if (user.role !== ROLES.HR_ADMIN) throw forbidden();

  requireFields(body, [
    'firstName',
    'lastName',
    'email',
    'departmentId',
    'designationId',
    'joiningDate',
    'basicSalary',
  ]);

  const email = body.email.trim().toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw badRequest('Enter a valid email address.');
  }

  const role = body.role || ROLES.EMPLOYEE;

  if (!OFFER_ROLES.includes(role)) {
    throw badRequest('Invalid role.');
  }

  const basicSalary = Number(body.basicSalary);
  const allowances = Number(body.allowances || 0);

  if (!(basicSalary > 0) || allowances < 0) {
    throw badRequest('Enter a valid salary.');
  }

  const [employees, offers] = await Promise.all([
    postgresEmployeeRepo.all(),
    postgresOfferRepo.all(),
  ]);

  if (employees.some((e) => e.email.toLowerCase() === email)) {
    throw conflict('An employee with this email already exists.');
  }

  if (offers.some((o) => o.email.toLowerCase() === email)) {
    throw conflict('An offer letter for this email already exists.');
  }

  const teamLeader = body.teamLeaderId
    ? employees.find((e) => e.id === body.teamLeaderId)
    : null;

  const processManager = body.processManagerId
    ? employees.find((e) => e.id === body.processManagerId)
    : null;

  if (body.teamLeaderId && teamLeader?.role !== ROLES.TEAM_LEADER) {
    throw badRequest('Select a valid Team Leader.');
  }

  if (body.processManagerId && processManager?.role !== ROLES.PROCESS_MANAGER) {
    throw badRequest('Select a valid Process Manager.');
  }

  const row = await postgresOfferRepo.insert({
    id: await postgresOfferRepo.nextId(),
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
    email,
    phone: body.phone?.trim(),
    role,
    departmentId: body.departmentId,
    designationId: body.designationId,
    location: body.location?.trim(),
    joiningDate: body.joiningDate,
    basicSalary,
    allowances,
    teamLeaderId: body.teamLeaderId,
    processManagerId: body.processManagerId,
    createdBy: user.employeeId,
  });

  await writeAudit({
    userId: user.id,
    action: 'offer.created',
    module: 'offers',
    recordId: row.id,
  });

  const [decorated] = await decorate([row]);

  return decorated;
}

export async function getOfferPdf(user, id) {
  if (user.role !== ROLES.HR_ADMIN) throw forbidden();

  const offer = await postgresOfferRepo.findById(id);
  if (!offer) throw notFound('Offer letter not found.');

  const [decorated] = await decorate([offer]);
  const signatory = fullName(await postgresEmployeeRepo.findById(user.employeeId));

  return {
    buffer: await buildOfferLetter(decorated, signatory),
    filename: `Offer-Letter-${offer.firstName}-${offer.lastName}.pdf`,
  };
}

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function generateTempPassword() {
  let password = '';

  for (let i = 0; i < 10; i += 1) {
    password += PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)];
  }

  return `${password}${randomInt(2, 10)}`;
}

export async function createLogin(user, offerId) {
  if (user.role !== ROLES.HR_ADMIN) throw forbidden();

  const offer = await postgresOfferRepo.findById(offerId);
  if (!offer) throw notFound('Offer letter not found.');

  if (offer.status !== 'issued' || offer.employeeId) {
    throw conflict('Login has already been created for this offer.');
  }

  const [employees, existingUser] = await Promise.all([
    postgresEmployeeRepo.all(),
    postgresUserRepo.findByEmail(offer.email),
  ]);

  if (
    existingUser ||
    employees.some((e) => e.email.toLowerCase() === offer.email.toLowerCase())
  ) {
    throw conflict('An account with this email already exists.');
  }

  const employeeId = await postgresEmployeeRepo.nextId();
  const employeeCode = `CL-${employeeId.slice(4)}`;

  if (employees.some((e) => e.employeeCode === employeeCode)) {
    throw conflict('Employee code is already in use.');
  }

  await postgresEmployeeRepo.insert({
    id: employeeId,
    employeeCode,
    firstName: offer.firstName,
    lastName: offer.lastName,
    email: offer.email,
    phone: offer.phone,
    departmentId: offer.departmentId,
    designationId: offer.designationId,
    role: offer.role,
    teamLeaderId: offer.teamLeaderId,
    processManagerId: offer.processManagerId,
    joiningDate: offer.joiningDate,
    location: offer.location,
    employmentStatus: 'active',
    basicSalary: offer.basicSalary,
    allowances: offer.allowances,
    bankName: null,
    bankAccount: null,
    ifsc: null,
    documents: [],
  });

  const temporaryPassword = generateTempPassword();

  await postgresUserRepo.insert({
    id: `USR-${employeeId.slice(4)}`,
    email: offer.email,
    passwordHash: await bcrypt.hash(temporaryPassword, 10),
    role: offer.role,
    employeeId,
    isActive: true,
    mustChangePassword: true,
  });

  await postgresOfferRepo.update(offerId, {
    status: 'onboarded',
    employeeId,
  });

  await writeAudit({
    userId: user.id,
    action: 'offer.login_created',
    module: 'offers',
    recordId: offerId,
    meta: { employeeId },
  });

  return {
    name: `${offer.firstName} ${offer.lastName}`,
    loginEmail: offer.email,
    temporaryPassword,
    employeeId,
    employeeCode,
  };
}

export async function resetLogin(user, offerId) {
  if (user.role !== ROLES.HR_ADMIN) throw forbidden();

  const offer = await postgresOfferRepo.findById(offerId);
  if (!offer) throw notFound('Offer letter not found.');

  if (offer.status !== 'onboarded' || !offer.employeeId) {
    throw conflict('Login has not been created for this offer yet.');
  }

  const account = await postgresUserRepo.findByEmployeeId(offer.employeeId);
  if (!account) throw notFound('Login account not found.');

  const employee = await postgresEmployeeRepo.findById(offer.employeeId);
  const temporaryPassword = generateTempPassword();

  await postgresUserRepo.update(account.id, {
    passwordHash: await bcrypt.hash(temporaryPassword, 10),
    mustChangePassword: true,
  });

  await writeAudit({
    userId: user.id,
    action: 'offer.login_reset',
    module: 'offers',
    recordId: offerId,
    meta: { employeeId: offer.employeeId },
  });

  return {
    name: `${offer.firstName} ${offer.lastName}`,
    loginEmail: account.email,
    temporaryPassword,
    employeeId: offer.employeeId,
    employeeCode: employee?.employeeCode || '',
  };
}