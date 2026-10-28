import {
  incentiveRepo,
  rewardRepo,
  penaltyRepo,
  goalRepo,
  reviewRepo,
  assetRepo,
  assetAssignmentRepo,
  assetRequestRepo,
  grievanceRepo,
  grievanceCommentRepo,
  reimbursementRepo,
  courseRepo,
  employeeCourseRepo,
  employeeRepo,
  departmentRepo,
  designationRepo,
} from '../repositories/index.js';
import { INCENTIVE_STATUS, REIMBURSE_STATUS, ASSET_REQUEST_STATUS } from '../config/workflows.js';
import { ROLES } from '../config/roles.js';
import { accessibleEmployeeIds, assertEmployeeAccess } from './scope.service.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js';
import { requireFields } from '../middleware/validate.js';
import { nextId, nowIso } from '../utils/ids.js';
import { writeAudit } from './audit.service.js';
import { notifyEmployee } from './notification.service.js';
import { getSettings, updateSettings } from '../repositories/index.js';

function nameOf(id) {
  const e = employeeRepo.findById(id);
  return e ? `${e.firstName} ${e.lastName}` : id;
}

function scoped(user, list, employeeKey = 'employeeId') {
  const accessibleIds = accessibleEmployeeIds(user);
  const ids = Array.isArray(accessibleIds) ? accessibleIds : [];
  return list.filter((row) => ids.includes(row[employeeKey]));
}

export function listIncentives(user) {
  return scoped(user, incentiveRepo.all()).map((r) => ({ ...r, employeeName: nameOf(r.employeeId) }));
}

export function recommendIncentive(user, body) {
  requireFields(body, ['employeeId', 'ruleCode', 'amount', 'reason', 'period']);
  assertEmployeeAccess(user, body.employeeId);
  if (![ROLES.TEAM_LEADER, ROLES.PROCESS_MANAGER, ROLES.HR_ADMIN].includes(user.role)) throw forbidden();
  const row = incentiveRepo.insert({
    id: nextId('INC', incentiveRepo.all()),
    employeeId: body.employeeId,
    ruleCode: body.ruleCode,
    amount: Number(body.amount),
    points: Number(body.points || 0),
    reason: body.reason,
    period: body.period,
    recommendedBy: user.employeeId,
    approvedBy: null,
    status: user.role === ROLES.HR_ADMIN ? INCENTIVE_STATUS.APPROVED : INCENTIVE_STATUS.PENDING_PM,
    createdAt: nowIso(),
  });
  writeAudit({ userId: user.id, action: 'incentive.recommended', module: 'incentives', recordId: row.id });
  return { ...row, employeeName: nameOf(row.employeeId) };
}

export function decideIncentive(user, id, { decision, note }) {
  const row = incentiveRepo.findById(id);
  if (!row) throw notFound('Incentive not found.');
  if (user.role === ROLES.PROCESS_MANAGER && row.status !== INCENTIVE_STATUS.PENDING_PM) {
    throw conflict('This request is not waiting for you.');
  }
  if (user.role === ROLES.HR_ADMIN && ![INCENTIVE_STATUS.PENDING_PM, INCENTIVE_STATUS.PENDING_HR].includes(row.status)) {
    throw conflict('This request is not waiting for you.');
  }
  if (![ROLES.PROCESS_MANAGER, ROLES.HR_ADMIN].includes(user.role)) throw forbidden();
  const status = decision === 'approve' ? INCENTIVE_STATUS.APPROVED : INCENTIVE_STATUS.REJECTED;
  const updated = incentiveRepo.update(id, { status, approvedBy: user.employeeId });
  writeAudit({
    userId: user.id,
    action: status === INCENTIVE_STATUS.APPROVED ? 'incentive.approved' : 'incentive.rejected',
    module: 'incentives',
    recordId: id,
    meta: { note },
  });
  notifyEmployee(row.employeeId, {
    title: 'Incentive update',
    body: `Incentive ${status.replaceAll('_', ' ')}.`,
    module: 'incentives',
  });
  return { ...updated, employeeName: nameOf(updated.employeeId) };
}

export function listRewards(user) {
  return scoped(user, rewardRepo.all()).map((r) => ({ ...r, employeeName: nameOf(r.employeeId) }));
}

export function createReward(user, body) {
  requireFields(body, ['employeeId', 'title', 'category']);
  const row = rewardRepo.insert({
    id: nextId('RWD', rewardRepo.all()),
    employeeId: body.employeeId,
    title: body.title,
    category: body.category,
    points: Number(body.points || 0),
    period: body.period || nowIso().slice(0, 7),
    awardedBy: user.employeeId,
    createdAt: nowIso(),
  });
  notifyEmployee(body.employeeId, { title: 'You were recognized', body: body.title, module: 'rewards' });
  writeAudit({ userId: user.id, action: 'reward.created', module: 'rewards', recordId: row.id });
  return { ...row, employeeName: nameOf(row.employeeId) };
}

export function listPenalties(user) {
  return scoped(user, penaltyRepo.all()).map((r) => ({ ...r, employeeName: nameOf(r.employeeId) }));
}

export function createPenalty(user, body) {
  requireFields(body, ['employeeId', 'reason', 'amount', 'penaltyDate', 'period']);
  const row = penaltyRepo.insert({
    id: nextId('PEN', penaltyRepo.all()),
    employeeId: body.employeeId,
    reason: body.reason,
    amount: Number(body.amount),
    penaltyDate: body.penaltyDate,
    period: body.period,
    addedBy: user.employeeId,
    status: 'pending',
    createdAt: nowIso(),
  });
  writeAudit({ userId: user.id, action: 'penalty.created', module: 'penalties', recordId: row.id });
  return { ...row, employeeName: nameOf(row.employeeId) };
}

export function decidePenalty(user, id, { decision }) {
  const row = penaltyRepo.findById(id);
  if (!row) throw notFound('Penalty not found.');
  const status = decision === 'approve' ? 'approved' : 'rejected';
  const updated = penaltyRepo.update(id, { status });
  writeAudit({ userId: user.id, action: `penalty.${status}`, module: 'penalties', recordId: id });
  return { ...updated, employeeName: nameOf(updated.employeeId) };
}

export function listGoals(user, employeeId) {
  const id = employeeId || user.employeeId;
  assertEmployeeAccess(user, id);
  return goalRepo.find((g) => g.employeeId === id);
}

export function listReviews(user, employeeId) {
  const id = employeeId || user.employeeId;
  assertEmployeeAccess(user, id);
  return reviewRepo.find((g) => g.employeeId === id).map((r) => ({ ...r, reviewerName: nameOf(r.reviewerId) }));
}

export function upsertReview(user, body) {
  requireFields(body, ['employeeId', 'period', 'score']);
  assertEmployeeAccess(user, body.employeeId);
  const row = reviewRepo.insert({
    id: nextId('PR', reviewRepo.all()),
    employeeId: body.employeeId,
    period: body.period,
    score: Number(body.score),
    managerFeedback: body.managerFeedback || '',
    employeeFeedback: body.employeeFeedback || '',
    reviewerId: user.employeeId,
    createdAt: nowIso(),
  });
  notifyEmployee(body.employeeId, { title: 'Performance review posted', body: `Score ${body.score} for ${body.period}`, module: 'performance' });
  return row;
}

export function listAssets(user) {
  if (user.role === ROLES.IT_ADMIN) {
    return assetRepo.all().map(decorateAsset);
  }
  const assigned = assetAssignmentRepo.find((a) => a.employeeId === user.employeeId && !a.returnedAt);
  return assigned.map((a) => decorateAsset(assetRepo.findById(a.assetId), a));
}

function decorateAsset(asset, assignment) {
  const asg = assignment || assetAssignmentRepo.findOne((a) => a.assetId === asset.id && !a.returnedAt);
  return {
    ...asset,
    assignedEmployeeId: asg?.employeeId || null,
    assignedEmployee: asg ? nameOf(asg.employeeId) : null,
    assignmentDate: asg?.assignedAt || null,
    returnDate: asg?.returnedAt || null,
  };
}

export function listAssetRequests(user) {
  if (user.role === ROLES.IT_ADMIN) return assetRequestRepo.all().map((r) => ({ ...r, employeeName: nameOf(r.employeeId) }));
  return scoped(user, assetRequestRepo.all()).map((r) => ({ ...r, employeeName: nameOf(r.employeeId) }));
}

export function requestAsset(user, body) {
  requireFields(body, ['assetType', 'reason']);
  const row = assetRequestRepo.insert({
    id: nextId('AR', assetRequestRepo.all()),
    employeeId: user.employeeId,
    assetType: body.assetType,
    reason: body.reason,
    status: ASSET_REQUEST_STATUS.PENDING_TL,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  writeAudit({ userId: user.id, action: 'asset.requested', module: 'assets', recordId: row.id });
  return { ...row, employeeName: nameOf(row.employeeId) };
}

export function decideAssetRequest(user, id, { decision, note, assetId }) {
  const row = assetRequestRepo.findById(id);
  if (!row) throw notFound('Asset request not found.');
  const emp = employeeRepo.findById(row.employeeId);
  const chain = [
    { role: ROLES.TEAM_LEADER, status: ASSET_REQUEST_STATUS.PENDING_TL, next: ASSET_REQUEST_STATUS.PENDING_PM, match: emp.teamLeaderId === user.employeeId },
    { role: ROLES.PROCESS_MANAGER, status: ASSET_REQUEST_STATUS.PENDING_PM, next: ASSET_REQUEST_STATUS.PENDING_IT, match: emp.processManagerId === user.employeeId },
    { role: ROLES.IT_ADMIN, status: ASSET_REQUEST_STATUS.PENDING_IT, next: ASSET_REQUEST_STATUS.FULFILLED, match: true },
  ];
  const step = chain.find((s) => s.role === user.role);
  if (!step || row.status !== step.status) throw conflict('This request is not waiting for you.');
  if (!step.match) throw forbidden();
  if (decision === 'reject') {
    const updated = assetRequestRepo.update(id, { status: ASSET_REQUEST_STATUS.REJECTED, updatedAt: nowIso() });
    notifyEmployee(row.employeeId, { title: 'Asset request rejected', body: note || '', module: 'assets' });
    return { ...updated, employeeName: nameOf(updated.employeeId) };
  }
  if (user.role === ROLES.IT_ADMIN) {
    if (!assetId) throw badRequest('Select an available asset to assign.');
    const asset = assetRepo.findById(assetId);
    if (!asset || asset.status !== 'available') throw conflict('Asset is not available.');
    assetRepo.update(assetId, { status: 'assigned' });
    assetAssignmentRepo.insert({
      id: nextId('AA', assetAssignmentRepo.all()),
      assetId,
      employeeId: row.employeeId,
      assignedAt: nowIso().slice(0, 10),
      returnedAt: null,
      assignedBy: user.employeeId,
    });
    writeAudit({ userId: user.id, action: 'asset.assigned', module: 'assets', recordId: assetId });
  }
  const updated = assetRequestRepo.update(id, { status: step.next, updatedAt: nowIso() });
  notifyEmployee(row.employeeId, { title: 'Asset request update', body: `Status: ${step.next.replaceAll('_', ' ')}`, module: 'assets' });
  return { ...updated, employeeName: nameOf(updated.employeeId) };
}

export function listGrievances(user) {
  const rows = user.role === ROLES.HR_ADMIN ? grievanceRepo.all() : scoped(user, grievanceRepo.all());
  return rows.map((r) => ({
    ...r,
    employeeName: nameOf(r.employeeId),
    comments: grievanceCommentRepo.find((c) => c.grievanceId === r.id),
  }));
}

export function createGrievance(user, body) {
  requireFields(body, ['subject', 'description', 'category']);
  const row = grievanceRepo.insert({
    id: nextId('GRV', grievanceRepo.all()),
    employeeId: user.employeeId,
    subject: body.subject,
    description: body.description,
    category: body.category,
    priority: body.priority || 'medium',
    status: 'open',
    assignedTo: 'HR',
    resolution: '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  writeAudit({ userId: user.id, action: 'grievance.created', module: 'grievances', recordId: row.id });
  return { ...row, employeeName: nameOf(row.employeeId), comments: [] };
}

export function commentGrievance(user, id, body) {
  requireFields(body, ['body']);
  const row = grievanceRepo.findById(id);
  if (!row) throw notFound('Grievance not found.');
  if (user.role !== ROLES.HR_ADMIN && row.employeeId !== user.employeeId) throw forbidden();
  const comment = grievanceCommentRepo.insert({
    id: nextId('GC', grievanceCommentRepo.all()),
    grievanceId: id,
    authorId: user.employeeId,
    body: body.body,
    createdAt: nowIso(),
  });
  grievanceRepo.update(id, { updatedAt: nowIso(), status: body.status || row.status, resolution: body.resolution ?? row.resolution });
  notifyEmployee(row.employeeId, { title: 'Grievance update', body: body.body, module: 'grievances' });
  return comment;
}

export function listReimbursements(user) {
  return scoped(user, reimbursementRepo.all()).map((r) => ({ ...r, employeeName: nameOf(r.employeeId) }));
}

export function submitReimbursement(user, body) {
  requireFields(body, ['expenseType', 'amount', 'expenseDate', 'description']);
  const row = reimbursementRepo.insert({
    id: nextId('RMB', reimbursementRepo.all()),
    employeeId: user.employeeId,
    expenseType: body.expenseType,
    amount: Number(body.amount),
    expenseDate: body.expenseDate,
    description: body.description,
    receiptName: body.receiptName || null,
    status: REIMBURSE_STATUS.PENDING_TL,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  writeAudit({ userId: user.id, action: 'reimbursement.submitted', module: 'reimbursements', recordId: row.id });
  return { ...row, employeeName: nameOf(row.employeeId) };
}

export function decideReimbursement(user, id, { decision, note }) {
  const row = reimbursementRepo.findById(id);
  if (!row) throw notFound('Reimbursement not found.');
  const emp = employeeRepo.findById(row.employeeId);
  const chain = [
    { role: ROLES.TEAM_LEADER, status: REIMBURSE_STATUS.PENDING_TL, next: REIMBURSE_STATUS.PENDING_PM, match: emp.teamLeaderId === user.employeeId },
    { role: ROLES.PROCESS_MANAGER, status: REIMBURSE_STATUS.PENDING_PM, next: REIMBURSE_STATUS.PENDING_FINANCE, match: emp.processManagerId === user.employeeId },
    { role: ROLES.FINANCE, status: REIMBURSE_STATUS.PENDING_FINANCE, next: REIMBURSE_STATUS.PAID, match: true },
  ];
  const step = chain.find((s) => s.role === user.role);
  if (!step || row.status !== step.status) throw conflict('This request is not waiting for you.');
  if (!step.match) throw forbidden();
  const status = decision === 'reject' ? REIMBURSE_STATUS.REJECTED : step.next;
  const updated = reimbursementRepo.update(id, { status, updatedAt: nowIso() });
  writeAudit({
    userId: user.id,
    action: decision === 'reject' ? 'reimbursement.rejected' : 'reimbursement.approved',
    module: 'reimbursements',
    recordId: id,
    meta: { note },
  });
  notifyEmployee(row.employeeId, { title: 'Reimbursement update', body: `Status: ${status.replaceAll('_', ' ')}`, module: 'reimbursements' });
  return { ...updated, employeeName: nameOf(updated.employeeId) };
}

export function listLearning(user) {
  const assignments = user.role === ROLES.HR_ADMIN || user.role === ROLES.PROCESS_MANAGER || user.role === ROLES.TEAM_LEADER
    ? scoped(user, employeeCourseRepo.all())
    : employeeCourseRepo.find((c) => c.employeeId === user.employeeId);
  return assignments.map((a) => {
    const course = courseRepo.findById(a.courseId);
    return { ...a, courseTitle: course?.title, kind: course?.kind, hours: course?.hours, employeeName: nameOf(a.employeeId) };
  });
}

export function listCourses() {
  return courseRepo.all();
}

export function assignCourse(user, body) {
  requireFields(body, ['employeeId', 'courseId']);
  assertEmployeeAccess(user, body.employeeId);
  const row = employeeCourseRepo.insert({
    id: nextId('EC', employeeCourseRepo.all()),
    employeeId: body.employeeId,
    courseId: body.courseId,
    status: 'assigned',
    certificate: null,
    assignedBy: user.employeeId,
    completedAt: null,
  });
  notifyEmployee(body.employeeId, { title: 'New learning assigned', body: 'A course was assigned to you.', module: 'learning' });
  return row;
}

export function completeCourse(user, id) {
  const row = employeeCourseRepo.findById(id);
  if (!row) throw notFound('Assignment not found.');
  if (row.employeeId !== user.employeeId) throw forbidden();
  return employeeCourseRepo.update(id, { status: 'completed', completedAt: nowIso(), certificate: `CERT-${id}` });
}

export function listLookups() {
  return {
    departments: departmentRepo.all(),
    designations: designationRepo.all(),
    settings: getSettings(),
  };
}

export function saveSettings(user, body) {
  const updated = updateSettings(body);
  writeAudit({ userId: user.id, action: 'settings.updated', module: 'settings', recordId: 'company' });
  return updated;
}

export function searchAll(user, q) {
  const query = String(q || '').trim().toLowerCase();
  if (query.length < 2) return { employees: [], assets: [], requests: [] };
  const ids = accessibleEmployeeIds(user);
  const employees = employeeRepo
    .all()
    .filter((e) => ids.includes(e.id))
    .filter((e) => `${e.firstName} ${e.lastName} ${e.email} ${e.employeeCode} ${e.id}`.toLowerCase().includes(query))
    .slice(0, 8)
    .map((e) => ({ type: 'employee', id: e.id, label: `${e.firstName} ${e.lastName}`, sub: e.employeeCode }));
  const departments = departmentRepo.all().filter((d) => d.name.toLowerCase().includes(query)).map((d) => ({ type: 'department', id: d.id, label: d.name }));
  const designations = designationRepo.all().filter((d) => d.name.toLowerCase().includes(query)).map((d) => ({ type: 'designation', id: d.id, label: d.name }));
  const assets = assetRepo.all().filter((a) => `${a.assetCode} ${a.serialNumber} ${a.assetType}`.toLowerCase().includes(query)).slice(0, 6).map((a) => ({ type: 'asset', id: a.id, label: a.assetCode, sub: a.assetType }));
  const requests = [
    ...leaveRepoSafe(ids, query),
  ];
  return { employees, departments, designations, assets, requests };
}

function leaveRepoSafe(ids, query) {
  return reimbursementRepo
    .find((r) => ids.includes(r.employeeId))
    .filter((r) => `${r.id} ${r.expenseType} ${r.description}`.toLowerCase().includes(query))
    .slice(0, 5)
    .map((r) => ({ type: 'reimbursement', id: r.id, label: r.id, sub: r.status }));
}
