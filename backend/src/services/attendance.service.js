
import { postgresAttendanceRepo } from '../repositories/postgres/attendance.repository.js';
import { postgresEmployeeRepo } from '../repositories/postgres/employee.repository.js';
import { accessibleEmployeeIds, assertEmployeeAccess } from './scope.service.js';
import { conflict, badRequest } from '../utils/errors.js';
import { todayIso } from '../utils/ids.js';
import { writeAudit } from './audit.service.js';

const LATE_AFTER = '09:15';
const FULL_DAY_MINUTES = 480;

function minutesBetween(start, end) {
  if (!start || !end) return 0;

  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);

  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

function currentTime() {
  const date = new Date();

  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;
}

function classifyStatus(checkIn) {
  return checkIn > LATE_AFTER ? 'late' : 'present';
}

async function withName(row) {
  if (!row) return null;

  const employee = await postgresEmployeeRepo.findById(row.employeeId);

  return {
    ...row,
    employeeName: employee
      ? `${employee.firstName} ${employee.lastName}`
      : row.employeeId,
    employeeCode: employee?.employeeCode,
  };
}

export async function listAttendance(user, query = {}) {
  const ids = await accessibleEmployeeIds(user);

  let rows = await postgresAttendanceRepo.find((row) =>
    ids.includes(row.employeeId)
  );

  if (query.employeeId) {
    await assertEmployeeAccess(user, query.employeeId);
    rows = rows.filter((row) => row.employeeId === query.employeeId);
  }

  if (query.from) {
    rows = rows.filter((row) => row.workDate >= query.from);
  }

  if (query.to) {
    rows = rows.filter((row) => row.workDate <= query.to);
  }

  const result = await Promise.all(rows.map(withName));

  return result.sort(
    (a, b) =>
      b.workDate.localeCompare(a.workDate) ||
      a.employeeId.localeCompare(b.employeeId)
  );
}

export async function todayAttendance(employeeId) {
  const date = todayIso();

  return postgresAttendanceRepo.findOne(
    (row) =>
      row.employeeId === employeeId &&
      row.workDate === date
  );
}

export async function checkIn(user) {
  const date = todayIso();
  const existing = await todayAttendance(user.employeeId);

  if (existing?.checkIn) {
    throw conflict('You have already checked in today.');
  }

  const time = currentTime();

  const row = existing
    ? await postgresAttendanceRepo.update(existing.id, {
        checkIn: time,
        status: classifyStatus(time),
      })
    : await postgresAttendanceRepo.insert({
        id: await postgresAttendanceRepo.nextId(),
        employeeId: user.employeeId,
        workDate: date,
        checkIn: time,
        checkOut: null,
        status: classifyStatus(time),
        workingMinutes: 0,
        overtimeMinutes: 0,
        source: 'manual',
      });

  await writeAudit({
    userId: user.id,
    action: 'attendance.check_in',
    module: 'attendance',
    recordId: row.id,
  });

  return withName(row);
}

export async function checkOut(user) {
  const existing = await todayAttendance(user.employeeId);

  if (!existing?.checkIn) {
    throw conflict('Check in before checking out.');
  }

  if (existing.checkOut) {
    throw conflict('You have already checked out today.');
  }

  const time = currentTime();
  const workingMinutes = minutesBetween(existing.checkIn, time);
  const overtimeMinutes = Math.max(
    0,
    workingMinutes - FULL_DAY_MINUTES
  );

  const updated = await postgresAttendanceRepo.update(existing.id, {
    checkOut: time,
    workingMinutes,
    overtimeMinutes,
  });

  await writeAudit({
    userId: user.id,
    action: 'attendance.check_out',
    module: 'attendance',
    recordId: existing.id,
  });

  return withName(updated);
}

export async function importRows(user, rows) {
  if (!Array.isArray(rows) || !rows.length) {
    throw badRequest('No attendance rows to import.');
  }

  let imported = 0;

  for (const row of rows) {
    if (!row.employeeId || !row.date) continue;

    const employee = await postgresEmployeeRepo.findById(row.employeeId);

    if (!employee) continue;

    const existing = await postgresAttendanceRepo.findOne(
      (item) =>
        item.employeeId === row.employeeId &&
        item.workDate === row.date
    );

    const payload = {
      employeeId: row.employeeId,
      workDate: row.date,
      checkIn: row.checkIn || null,
      checkOut: row.checkOut || null,
      status:
        row.status ||
        (row.checkIn ? classifyStatus(row.checkIn) : 'absent'),
      workingMinutes: minutesBetween(row.checkIn, row.checkOut),
      overtimeMinutes: 0,
      source: 'import',
    };

    if (existing) {
      await postgresAttendanceRepo.update(existing.id, payload);
    } else {
      await postgresAttendanceRepo.insert({
        id: await postgresAttendanceRepo.nextId(),
        ...payload,
      });
    }

    imported += 1;
  }

  await writeAudit({
    userId: user.id,
    action: 'attendance.imported',
    module: 'attendance',
    recordId: null,
    meta: { count: imported },
  });

  return { imported };
}
