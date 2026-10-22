import { leaveRepo, leaveBalanceRepo, employeeRepo } from '../repositories/index.js';
import { LEAVE_STATUS, LEAVE_TYPES } from '../config/workflows.js';
import { ROLES } from '../config/roles.js';
import { accessibleEmployeeIds, assertEmployeeAccess } from './scope.service.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js';
import { requireFields } from '../middleware/validate.js';
import { nextId, nowIso } from '../utils/ids.js';
import { writeAudit } from './audit.service.js';
import { notifyEmployee } from './notification.service.js';

function withName(row) {
  const e = employeeRepo.findById(row.employeeId);
  return {
    ...row,
    employeeName: e ? `${e.firstName} ${e.lastName}` : row.employeeId,
    leaveTypeName: LEAVE_TYPES.find((t) => t.code === row.leaveType)?.name || row.leaveType,
  };
}

function dayCount(start, end) {
  const a = new Date(start);
  const b = new Date(end);
  return Math.floor((b - a) / 86400000) + 1;
}

export function listLeave(user, query = {}) {
  const ids = accessibleEmployeeIds(user);
  let rows = leaveRepo.find((r) => ids.includes(r.employeeId));
  if (query.employeeId) {
    assertEmployeeAccess(user, query.employeeId);
    rows = rows.filter((r) => r.employeeId === query.employeeId);
  }
  if (query.status) rows = rows.filter((r) => r.status === query.status);
  return rows.map(withName).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function balancesFor(employeeId) {
  return leaveBalanceRepo.find((b) => b.employeeId === employeeId);
}

export function applyLeave(user, body) {
  requireFields(body, ['leaveType', 'startDate', 'endDate', 'reason']);
  const type = LEAVE_TYPES.find((t) => t.code === body.leaveType);
  if (!type) throw badRequest('Unknown leave type.');
  const days = dayCount(body.startDate, body.endDate);
  if (days < 1) throw badRequest('End date must be on or after start date.');
  const balance = leaveBalanceRepo.findOne(
    (b) => b.employeeId === user.employeeId && b.leaveType === body.leaveType
  );
  if (balance && body.leaveType !== 'long' && balance.balance < days) {
    throw badRequest('Insufficient leave balance.');
  }
  const row = leaveRepo.insert({
    id: nextId('LV', leaveRepo.all()),
    employeeId: user.employeeId,
    leaveType: body.leaveType,
    startDate: body.startDate,
    endDate: body.endDate,
    days,
    reason: body.reason.trim(),
    status: LEAVE_STATUS.PENDING_TL,
    decidedBy: null,
    decisionNote: '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  writeAudit({ userId: user.id, action: 'leave.submitted', module: 'leave', recordId: row.id });
  const emp = employeeRepo.findById(user.employeeId);
  if (emp?.teamLeaderId) {
    notifyEmployee(emp.teamLeaderId, {
      title: 'Leave request pending',
      body: `${emp.firstName} ${emp.lastName} applied for ${type.name}.`,
      module: 'leave',
    });
  }
  return withName(row);
}

export function decideLeave(user, id, { decision, note }) {
  const row = leaveRepo.findById(id);
  if (!row) throw notFound('Leave request not found.');
  if (!['approve', 'reject'].includes(decision)) throw badRequest('Decision must be approve or reject.');

  const employee = employeeRepo.findById(row.employeeId);
  if (user.role === ROLES.TEAM_LEADER) {
    if (row.status !== LEAVE_STATUS.PENDING_TL) {
      throw conflict('This request is not waiting for you.');
    }
    if (employee.teamLeaderId !== user.employeeId) throw forbidden();
    if (decision === 'reject') return finalize(user, row, LEAVE_STATUS.REJECTED, note);
    const next = row.leaveType === 'long' ? LEAVE_STATUS.PENDING_PM : LEAVE_STATUS.PENDING_PM;
    return advance(user, row, next, note || 'Forwarded to Process Manager');
  }

  if (user.role === ROLES.PROCESS_MANAGER) {
    if (row.status !== LEAVE_STATUS.PENDING_PM) {
      throw conflict('This request is not waiting for you.');
    }
    if (employee.processManagerId !== user.employeeId) throw forbidden();
    if (decision === 'reject') return finalize(user, row, LEAVE_STATUS.REJECTED, note);
    if (row.leaveType === 'long') {
      return advance(user, row, LEAVE_STATUS.PENDING_HR, note || 'Forwarded to HR');
    }
    return finalize(user, row, LEAVE_STATUS.APPROVED, note);
  }

  if (user.role === ROLES.HR_ADMIN) {
    if (row.status !== LEAVE_STATUS.PENDING_HR) {
      throw conflict('This request is not waiting for you.');
    }
    if (decision === 'reject') return finalize(user, row, LEAVE_STATUS.REJECTED, note);
    return finalize(user, row, LEAVE_STATUS.APPROVED, note);
  }

  throw forbidden();
}

function advance(user, row, status, note) {
  const updated = leaveRepo.update(row.id, {
    status,
    decidedBy: user.employeeId,
    decisionNote: note || '',
    updatedAt: nowIso(),
  });
  writeAudit({ userId: user.id, action: 'leave.forwarded', module: 'leave', recordId: row.id, meta: { status } });
  notifyEmployee(row.employeeId, {
    title: 'Leave update',
    body: `Your leave request moved to ${status.replaceAll('_', ' ')}.`,
    module: 'leave',
  });
  return withName(updated);
}

function finalize(user, row, status, note) {
  if (status === LEAVE_STATUS.APPROVED) {
    const bal = leaveBalanceRepo.findOne(
      (b) => b.employeeId === row.employeeId && b.leaveType === row.leaveType
    );
    if (bal) leaveBalanceRepo.update(bal.id, { balance: Math.max(0, bal.balance - row.days) });
  }
  const updated = leaveRepo.update(row.id, {
    status,
    decidedBy: user.employeeId,
    decisionNote: note || '',
    updatedAt: nowIso(),
  });
  writeAudit({
    userId: user.id,
    action: status === LEAVE_STATUS.APPROVED ? 'leave.approved' : 'leave.rejected',
    module: 'leave',
    recordId: row.id,
  });
  notifyEmployee(row.employeeId, {
    title: status === LEAVE_STATUS.APPROVED ? 'Leave approved' : 'Leave rejected',
    body: note || `Your leave request was ${status}.`,
    module: 'leave',
  });
  return withName(updated);
}
