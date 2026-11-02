import { postgresLeaveRepo } from '../repositories/postgres/leave.repository.js';
import { postgresLeaveBalanceRepo } from '../repositories/postgres/leaveBalance.repository.js';
import { postgresEmployeeRepo } from '../repositories/postgres/employee.repository.js';
import { LEAVE_STATUS, LEAVE_TYPES } from '../config/workflows.js';
import { ROLES } from '../config/roles.js';
import { accessibleEmployeeIds, assertEmployeeAccess } from './scope.service.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js';
import { requireFields } from '../middleware/validate.js';
import { writeAudit } from './audit.service.js';
import { notifyEmployee } from './notification.service.js';

async function withName(row) {
  if (!row) return null;

  const employee = await postgresEmployeeRepo.findById(row.employeeId);

  return {
    ...row,
    employeeName: employee
      ? `${employee.firstName} ${employee.lastName}`
      : row.employeeId,
    leaveTypeName:
      LEAVE_TYPES.find((type) => type.code === row.leaveType)?.name ||
      row.leaveType,
  };
}

function dayCount(start, end) {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  return Math.floor((endDate - startDate) / 86400000) + 1;
}

export async function listLeave(user, query = {}) {
  const ids = await accessibleEmployeeIds(user);

  let rows = await postgresLeaveRepo.find((row) =>
    ids.includes(row.employeeId)
  );

  if (query.employeeId) {
    await assertEmployeeAccess(user, query.employeeId);
    rows = rows.filter((row) => row.employeeId === query.employeeId);
  }

  if (query.status) {
    rows = rows.filter((row) => row.status === query.status);
  }

  const result = await Promise.all(rows.map(withName));

  return result.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function balancesFor(employeeId) {
  return postgresLeaveBalanceRepo.find(
    (balance) => balance.employeeId === employeeId
  );
}

export async function applyLeave(user, body) {
  requireFields(body, ['leaveType', 'startDate', 'endDate', 'reason']);

  const type = LEAVE_TYPES.find((item) => item.code === body.leaveType);

  if (!type) {
    throw badRequest('Unknown leave type.');
  }

  const days = dayCount(body.startDate, body.endDate);

  if (days < 1) {
    throw badRequest('End date must be on or after start date.');
  }

  const balance = await postgresLeaveBalanceRepo.findOne(
    (item) =>
      item.employeeId === user.employeeId &&
      item.leaveType === body.leaveType
  );

  if (
    balance &&
    body.leaveType !== 'long' &&
    balance.balance < days
  ) {
    throw badRequest('Insufficient leave balance.');
  }

  const row = await postgresLeaveRepo.insert({
    id: await postgresLeaveRepo.nextId(),
    employeeId: user.employeeId,
    leaveType: body.leaveType,
    startDate: body.startDate,
    endDate: body.endDate,
    days,
    reason: body.reason.trim(),
    status: LEAVE_STATUS.PENDING_TL,
    decidedBy: null,
    decisionNote: '',
  });

  await writeAudit({
    userId: user.id,
    action: 'leave.submitted',
    module: 'leave',
    recordId: row.id,
  });

  const employee = await postgresEmployeeRepo.findById(user.employeeId);

  if (employee?.teamLeaderId) {
    await notifyEmployee(employee.teamLeaderId, {
      title: 'Leave request pending',
      body: `${employee.firstName} ${employee.lastName} applied for ${type.name}.`,
      module: 'leave',
    });
  }

  return withName(row);
}

export async function decideLeave(user, id, { decision, note }) {
  const row = await postgresLeaveRepo.findById(id);

  if (!row) {
    throw notFound('Leave request not found.');
  }

  if (!['approve', 'reject'].includes(decision)) {
    throw badRequest('Decision must be approve or reject.');
  }

  const pendingStatuses = [
    LEAVE_STATUS.PENDING_TL,
    LEAVE_STATUS.PENDING_PM,
    LEAVE_STATUS.PENDING_HR,
  ];

  if (!pendingStatuses.includes(row.status)) {
    throw conflict('This request is already decided.');
  }

  const employee = await postgresEmployeeRepo.findById(row.employeeId);

  if (!employee) {
    throw notFound('Employee not found.');
  }

  if (user.role === ROLES.TEAM_LEADER) {
    if (row.status !== LEAVE_STATUS.PENDING_TL) {
      throw conflict('This request is not waiting for you.');
    }

    if (employee.teamLeaderId !== user.employeeId) {
      throw forbidden();
    }

    if (decision === 'reject') {
      return finalize(user, row, LEAVE_STATUS.REJECTED, note);
    }

    return advance(
      user,
      row,
      LEAVE_STATUS.PENDING_PM,
      note || 'Forwarded to Process Manager'
    );
  }

  if (user.role === ROLES.PROCESS_MANAGER) {
    if (row.status === LEAVE_STATUS.PENDING_HR) {
      throw conflict('This request is waiting for HR.');
    }

    if (employee.processManagerId !== user.employeeId) {
      throw forbidden();
    }

    if (decision === 'reject') {
      return finalize(user, row, LEAVE_STATUS.REJECTED, note);
    }

    if (row.leaveType === 'long') {
      return advance(
        user,
        row,
        LEAVE_STATUS.PENDING_HR,
        note || 'Forwarded to HR'
      );
    }

    return finalize(user, row, LEAVE_STATUS.APPROVED, note);
  }

  if (user.role === ROLES.HR_ADMIN) {
    if (decision === 'reject') {
      return finalize(user, row, LEAVE_STATUS.REJECTED, note);
    }

    return finalize(user, row, LEAVE_STATUS.APPROVED, note);
  }

  throw forbidden();
}

async function advance(user, row, status, note) {
  const updated = await postgresLeaveRepo.update(row.id, {
    status,
    decidedBy: user.employeeId,
    decisionNote: note || '',
  });

  await writeAudit({
    userId: user.id,
    action: 'leave.forwarded',
    module: 'leave',
    recordId: row.id,
    meta: { status },
  });

  await notifyEmployee(row.employeeId, {
    title: 'Leave update',
    body: `Your leave request moved to ${status.replaceAll('_', ' ')}.`,
    module: 'leave',
  });

  return withName(updated);
}

async function finalize(user, row, status, note) {
  if (status === LEAVE_STATUS.APPROVED) {
    const balance = await postgresLeaveBalanceRepo.findOne(
      (item) =>
        item.employeeId === row.employeeId &&
        item.leaveType === row.leaveType
    );

    if (balance) {
      await postgresLeaveBalanceRepo.update(balance.id, {
        balance: Math.max(0, balance.balance - row.days),
      });
    }
  }

  const updated = await postgresLeaveRepo.update(row.id, {
    status,
    decidedBy: user.employeeId,
    decisionNote: note || '',
  });

  await writeAudit({
    userId: user.id,
    action:
      status === LEAVE_STATUS.APPROVED
        ? 'leave.approved'
        : 'leave.rejected',
    module: 'leave',
    recordId: row.id,
  });

  await notifyEmployee(row.employeeId, {
    title: status === LEAVE_STATUS.APPROVED ? 'Leave approved' : 'Leave rejected',
    body: note || `Your leave request was ${status}.`,
    module: 'leave',
  });

  return withName(updated);
}