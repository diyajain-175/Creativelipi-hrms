import { attendanceRepo, employeeRepo } from '../repositories/index.js';
import { getSettings } from '../repositories/index.js';
import { accessibleEmployeeIds, assertEmployeeAccess } from './scope.service.js';
import { conflict, badRequest } from '../utils/errors.js';
import { nextId, todayIso, nowIso } from '../utils/ids.js';
import { writeAudit } from './audit.service.js';

function minutesBetween(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

function currentTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function classifyStatus(checkIn) {
  const lateAfter = getSettings().lateAfter || '09:15';
  return checkIn > lateAfter ? 'late' : 'present';
}

export function listAttendance(user, query = {}) {
  const ids = accessibleEmployeeIds(user);
  let rows = attendanceRepo.find((r) => ids.includes(r.employeeId));
  if (query.employeeId) {
    assertEmployeeAccess(user, query.employeeId);
    rows = rows.filter((r) => r.employeeId === query.employeeId);
  }
  if (query.from) rows = rows.filter((r) => r.workDate >= query.from);
  if (query.to) rows = rows.filter((r) => r.workDate <= query.to);
  return rows
    .map(withName)
    .sort((a, b) => b.workDate.localeCompare(a.workDate) || a.employeeId.localeCompare(b.employeeId));
}

function withName(row) {
  const e = employeeRepo.findById(row.employeeId);
  return {
    ...row,
    employeeName: e ? `${e.firstName} ${e.lastName}` : row.employeeId,
    employeeCode: e?.employeeCode,
  };
}

export function todayAttendance(employeeId) {
  const date = todayIso();
  return attendanceRepo.findOne((r) => r.employeeId === employeeId && r.workDate === date);
}

export function checkIn(user) {
  const date = todayIso();
  const existing = todayAttendance(user.employeeId);
  if (existing?.checkIn) throw conflict('You have already checked in today.');
  const time = currentTime();
  if (existing) {
    return withName(attendanceRepo.update(existing.id, { checkIn: time, status: classifyStatus(time) }));
  }
  const row = attendanceRepo.insert({
    id: nextId('ATT', attendanceRepo.all()),
    employeeId: user.employeeId,
    workDate: date,
    checkIn: time,
    checkOut: null,
    status: classifyStatus(time),
    workingMinutes: 0,
    overtimeMinutes: 0,
    source: 'manual',
  });
  writeAudit({ userId: user.id, action: 'attendance.check_in', module: 'attendance', recordId: row.id });
  return withName(row);
}

export function checkOut(user) {
  const existing = todayAttendance(user.employeeId);
  if (!existing?.checkIn) throw conflict('Check in before checking out.');
  if (existing.checkOut) throw conflict('You have already checked out today.');
  const time = currentTime();
  const workingMinutes = minutesBetween(existing.checkIn, time);
  const fullDay = getSettings().fullDayMinutes || 480;
  const overtimeMinutes = Math.max(0, workingMinutes - fullDay);
  const updated = attendanceRepo.update(existing.id, { checkOut: time, workingMinutes, overtimeMinutes });
  writeAudit({ userId: user.id, action: 'attendance.check_out', module: 'attendance', recordId: existing.id });
  return withName(updated);
}

export function importRows(user, rows) {
  if (!Array.isArray(rows) || !rows.length) throw badRequest('No attendance rows to import.');
  const imported = [];
  for (const row of rows) {
    if (!row.employeeId || !row.date) continue;
    const employee = employeeRepo.findById(row.employeeId);
    if (!employee) continue;
    const existing = attendanceRepo.findOne((r) => r.employeeId === row.employeeId && r.workDate === row.date);
    const payload = {
      employeeId: row.employeeId,
      workDate: row.date,
      checkIn: row.checkIn || null,
      checkOut: row.checkOut || null,
      status: row.status || (row.checkIn ? classifyStatus(row.checkIn) : 'absent'),
      workingMinutes: minutesBetween(row.checkIn, row.checkOut),
      overtimeMinutes: 0,
      source: 'import',
    };
    if (existing) {
      imported.push(attendanceRepo.update(existing.id, payload));
    } else {
      imported.push(
        attendanceRepo.insert({
          id: nextId('ATT', attendanceRepo.all()),
          ...payload,
        })
      );
    }
  }
  writeAudit({
    userId: user.id,
    action: 'attendance.imported',
    module: 'attendance',
    recordId: nowIso(),
    meta: { count: imported.length },
  });
  return { imported: imported.length };
}
