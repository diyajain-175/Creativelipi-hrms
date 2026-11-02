import { postgresIncentiveRepo } from '../repositories/postgres/incentive.repository.js';
import { postgresRewardRepo } from '../repositories/postgres/reward.repository.js';
import { postgresPenaltyRepo } from '../repositories/postgres/penalty.repository.js';
import { postgresGoalRepo } from '../repositories/postgres/goal.repository.js';
import { postgresReviewRepo } from '../repositories/postgres/review.repository.js';
import { postgresAssetRepo } from '../repositories/postgres/asset.repository.js';
import { postgresAssetAssignmentRepo } from '../repositories/postgres/asset-assignment.repository.js';
import { postgresAssetRequestRepo } from '../repositories/postgres/asset-request.repository.js';
import { postgresGrievanceRepo } from '../repositories/postgres/grievance.repository.js';
import { postgresGrievanceCommentRepo } from '../repositories/postgres/grievance-comment.repository.js';
import { postgresReimbursementRepo } from '../repositories/postgres/reimbursement.repository.js';
import { postgresCourseRepo } from '../repositories/postgres/course.repository.js';
import { postgresEmployeeCourseRepo } from '../repositories/postgres/employee-course.repository.js';
import { postgresEmployeeRepo } from '../repositories/postgres/employee.repository.js';
import { postgresDepartmentRepo } from '../repositories/postgres/department.repository.js';
import { postgresDesignationRepo } from '../repositories/postgres/designation.repository.js';

import {
  INCENTIVE_STATUS,
  REIMBURSE_STATUS,
  ASSET_REQUEST_STATUS,
} from '../config/workflows.js';

import { ROLES } from '../config/roles.js';
import { accessibleEmployeeIds, assertEmployeeAccess } from './scope.service.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js';
import { requireFields } from '../middleware/validate.js';
import { writeAudit } from './audit.service.js';
import { notifyEmployee } from './notification.service.js';
import { getSettings, updateSettings } from '../repositories/index.js';
import { nextStatusAfterApproval } from './approval.service.js';

const nowIso = () => new Date().toISOString();

async function nameOf(id) {
  if (!id) return '';
  const employee = await postgresEmployeeRepo.findById(id);

  return employee
    ? `${employee.firstName} ${employee.lastName}`.trim()
    : id;
}

async function scoped(user, rows, employeeKey = 'employeeId') {
  const ids = await accessibleEmployeeIds(user);
  return rows.filter((row) => ids.includes(row[employeeKey]));
}

async function withEmployeeName(row) {
  return {
    ...row,
    employeeName: await nameOf(row.employeeId),
  };
}

function makeId(prefix, id) {
  return `${prefix}-${id}`;
}

// Incentives

export async function listIncentives(user) {
  const rows = await postgresIncentiveRepo.all();
  const visible = await scoped(user, rows);

  return Promise.all(
    visible.map(async (row) => ({
      ...(await withEmployeeName(row)),
      recommendedByName: await nameOf(row.recommendedBy),
      approvedByName: await nameOf(row.approvedBy),
    }))
  );
}

export async function recommendIncentive(user, body) {
  requireFields(body, ['employeeId', 'ruleCode', 'amount', 'reason', 'period']);
  await assertEmployeeAccess(user, body.employeeId);

  if (body.employeeId === user.employeeId) {
    throw forbidden('You cannot recommend an incentive for yourself.');
  }

  const amount = Number(body.amount);

  if (!(amount > 0)) {
    throw badRequest('Amount must be greater than zero.');
  }

  const status = {
    [ROLES.TEAM_LEADER]: INCENTIVE_STATUS.PENDING_PM,
    [ROLES.PROCESS_MANAGER]: INCENTIVE_STATUS.PENDING_HR,
    [ROLES.HR_ADMIN]: INCENTIVE_STATUS.APPROVED,
  }[user.role];

  if (!status) throw forbidden();

  const row = await postgresIncentiveRepo.insert({
    id: await postgresIncentiveRepo.nextId(),
    employeeId: body.employeeId,
    ruleCode: body.ruleCode,
    amount,
    points: Number(body.points || 0),
    reason: body.reason,
    period: body.period,
    recommendedBy: user.employeeId,
    approvedBy: user.role === ROLES.HR_ADMIN ? user.employeeId : null,
    status,
    createdAt: nowIso(),
  });

  await writeAudit({
    userId: user.id,
    action: 'incentive.recommended',
    module: 'incentives',
    recordId: row.id,
  });

  return withEmployeeName(row);
}

export async function decideIncentive(user, id, { decision, note }) {
  const row = await postgresIncentiveRepo.findById(id);
  if (!row) throw notFound('Incentive not found.');

  if (!['approve', 'reject'].includes(decision)) {
    throw badRequest('Decision must be approve or reject.');
  }

  const employee = await postgresEmployeeRepo.findById(row.employeeId);
  if (!employee) throw notFound('Employee not found.');

  if (employee.id === user.employeeId) {
    throw forbidden('You cannot decide your own incentive.');
  }

  if (user.role === ROLES.PROCESS_MANAGER) {
    if (row.status !== INCENTIVE_STATUS.PENDING_PM) {
      throw conflict('This request is not waiting for you.');
    }

    if (employee.processManagerId !== user.employeeId) {
      throw forbidden();
    }
  } else if (user.role === ROLES.HR_ADMIN) {
    if (
      ![INCENTIVE_STATUS.PENDING_PM, INCENTIVE_STATUS.PENDING_HR].includes(row.status)
    ) {
      throw conflict('This request is not waiting for you.');
    }
  } else {
    throw forbidden();
  }

  const status = decision === 'approve'
    ? INCENTIVE_STATUS.APPROVED
    : INCENTIVE_STATUS.REJECTED;

  const updated = await postgresIncentiveRepo.update(id, {
    status,
    approvedBy: user.employeeId,
  });

  await writeAudit({
    userId: user.id,
    action: status === INCENTIVE_STATUS.APPROVED
      ? 'incentive.approved'
      : 'incentive.rejected',
    module: 'incentives',
    recordId: id,
    meta: { note },
  });

  await notifyEmployee(row.employeeId, {
    title: 'Incentive update',
    body: `Incentive ${status.replaceAll('_', ' ')}.`,
    module: 'incentives',
  });

  return withEmployeeName(updated);
}

// Rewards

export async function listRewards(user) {
  const rows = await postgresRewardRepo.all();
  const visible = await scoped(user, rows);

  return Promise.all(
    visible.map(async (row) => ({
      ...(await withEmployeeName(row)),
      awardedByName: await nameOf(row.awardedBy),
    }))
  );
}

export async function createReward(user, body) {
  requireFields(body, ['employeeId', 'title', 'category']);
  await assertEmployeeAccess(user, body.employeeId);

  const row = await postgresRewardRepo.insert({
    id: await postgresRewardRepo.nextId(),
    employeeId: body.employeeId,
    title: body.title,
    category: body.category,
    points: Number(body.points || 0),
    period: body.period || nowIso().slice(0, 7),
    awardedBy: user.employeeId,
    createdAt: nowIso(),
  });

  await notifyEmployee(body.employeeId, {
    title: 'You were recognized',
    body: body.title,
    module: 'rewards',
  });

  await writeAudit({
    userId: user.id,
    action: 'reward.created',
    module: 'rewards',
    recordId: row.id,
  });

  return withEmployeeName(row);
}

// Penalties

export async function listPenalties(user) {
  const rows = await postgresPenaltyRepo.all();
  const visible = await scoped(user, rows);

  return Promise.all(visible.map(withEmployeeName));
}

export async function createPenalty(user, body) {
  requireFields(body, ['employeeId', 'reason', 'amount', 'penaltyDate', 'period']);
  await assertEmployeeAccess(user, body.employeeId);

  const row = await postgresPenaltyRepo.insert({
    id: await postgresPenaltyRepo.nextId(),
    employeeId: body.employeeId,
    reason: body.reason,
    amount: Number(body.amount),
    penaltyDate: body.penaltyDate,
    period: body.period,
    addedBy: user.employeeId,
    status: 'pending',
    createdAt: nowIso(),
  });

  await writeAudit({
    userId: user.id,
    action: 'penalty.created',
    module: 'penalties',
    recordId: row.id,
  });

  return withEmployeeName(row);
}

export async function decidePenalty(user, id, { decision }) {
  if (![ROLES.PROCESS_MANAGER, ROLES.HR_ADMIN, ROLES.FINANCE].includes(user.role)) {
    throw forbidden();
  }

  const row = await postgresPenaltyRepo.findById(id);
  if (!row) throw notFound('Penalty not found.');

  const status = decision === 'approve' ? 'approved' : 'rejected';

  const updated = await postgresPenaltyRepo.update(id, { status });

  await writeAudit({
    userId: user.id,
    action: `penalty.${status}`,
    module: 'penalties',
    recordId: id,
  });

  return withEmployeeName(updated);
}

// Performance

const MANAGER_ROLES = [
  ROLES.TEAM_LEADER,
  ROLES.PROCESS_MANAGER,
  ROLES.HR_ADMIN,
];

export async function listGoals(user, employeeId) {
  const id = employeeId || user.employeeId;
  await assertEmployeeAccess(user, id);

  return postgresGoalRepo.find((goal) => goal.employeeId === id);
}

export async function listReviews(user, employeeId) {
  const id = employeeId || user.employeeId;
  await assertEmployeeAccess(user, id);

  const reviews = await postgresReviewRepo.find(
    (review) => review.employeeId === id
  );

  return Promise.all(
    reviews.map(async (review) => ({
      ...review,
      reviewerName: await nameOf(review.reviewerId),
    }))
  );
}

export async function createGoal(user, body) {
  requireFields(body, ['employeeId', 'title', 'period']);

  if (!MANAGER_ROLES.includes(user.role)) throw forbidden();

  if (body.employeeId === user.employeeId) {
    throw forbidden('You cannot set goals for yourself.');
  }

  await assertEmployeeAccess(user, body.employeeId);

  const row = await postgresGoalRepo.insert({
    id: await postgresGoalRepo.nextId(),
    employeeId: body.employeeId,
    title: body.title.trim(),
    kpi: body.kpi?.trim() || null,
    period: body.period,
    target: body.target?.trim() || null,
    progress: 0,
  });

  await notifyEmployee(body.employeeId, {
    title: 'New goal assigned',
    body: row.title,
    module: 'performance',
  });

  await writeAudit({
    userId: user.id,
    action: 'performance.goal_created',
    module: 'performance',
    recordId: row.id,
  });

  return row;
}

export async function updateGoalProgress(user, id, body) {
  if (!MANAGER_ROLES.includes(user.role)) throw forbidden();

  const goal = await postgresGoalRepo.findById(id);
  if (!goal) throw notFound('Goal not found.');

  if (goal.employeeId === user.employeeId) {
    throw forbidden('You cannot update progress on your own goal.');
  }

  await assertEmployeeAccess(user, goal.employeeId);

  const progress = Number(body.progress);

  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    throw badRequest('Progress must be between 0 and 100.');
  }

  const updated = await postgresGoalRepo.update(id, { progress });

  await writeAudit({
    userId: user.id,
    action: 'performance.goal_progress',
    module: 'performance',
    recordId: id,
    meta: { progress },
  });

  return updated;
}

export async function upsertReview(user, body) {
  requireFields(body, ['employeeId', 'period', 'score']);

  if (!MANAGER_ROLES.includes(user.role)) throw forbidden();

  if (body.employeeId === user.employeeId) {
    throw forbidden('You cannot review yourself.');
  }

  await assertEmployeeAccess(user, body.employeeId);

  const score = Number(body.score);

  if (!Number.isFinite(score) || score < 0 || score > 10) {
    throw badRequest('Score must be between 0 and 10.');
  }

  const row = await postgresReviewRepo.insert({
    id: await postgresReviewRepo.nextId(),
    employeeId: body.employeeId,
    period: body.period,
    score,
    managerFeedback: body.managerFeedback || '',
    employeeFeedback: '',
    reviewerId: user.employeeId,
    createdAt: nowIso(),
  });

  await notifyEmployee(body.employeeId, {
    title: 'Performance review posted',
    body: `Score ${score} for ${body.period}`,
    module: 'performance',
  });

  await writeAudit({
    userId: user.id,
    action: 'performance.review_created',
    module: 'performance',
    recordId: row.id,
  });

  return row;
}

export async function addReviewFeedback(user, id, body) {
  requireFields(body, ['feedback']);

  const review = await postgresReviewRepo.findById(id);
  if (!review) throw notFound('Review not found.');

  if (review.employeeId !== user.employeeId) throw forbidden();

  const updated = await postgresReviewRepo.update(id, {
    employeeFeedback: body.feedback.trim(),
  });

  if (review.reviewerId) {
    await notifyEmployee(review.reviewerId, {
      title: 'Employee feedback received',
      body: `${await nameOf(user.employeeId)} added feedback on a review.`,
      module: 'performance',
    });
  }

  await writeAudit({
    userId: user.id,
    action: 'performance.employee_feedback',
    module: 'performance',
    recordId: id,
  });

  return updated;
}

// Assets

async function decorateAsset(asset, assignment) {
  if (!asset) return null;

  const currentAssignment = assignment || await postgresAssetAssignmentRepo.findOne(
    (item) => item.assetId === asset.id && !item.returnedAt
  );

  return {
    ...asset,
    assignedEmployeeId: currentAssignment?.employeeId || null,
    assignedEmployee: currentAssignment
      ? await nameOf(currentAssignment.employeeId)
      : null,
    assignmentDate: currentAssignment?.assignedAt || null,
    returnDate: currentAssignment?.returnedAt || null,
  };
}

export async function listAssets(user) {
  if (user.role === ROLES.IT_ADMIN || user.role === ROLES.HR_ADMIN) {
    const assets = await postgresAssetRepo.all();

    return Promise.all(assets.map((asset) => decorateAsset(asset)));
  }

  const assignments = await postgresAssetAssignmentRepo.find(
    (item) => item.employeeId === user.employeeId && !item.returnedAt
  );

  return Promise.all(
    assignments.map(async (assignment) => {
      const asset = await postgresAssetRepo.findById(assignment.assetId);
      return decorateAsset(asset, assignment);
    })
  );
}

export async function listAssetRequests(user) {
  const rows = await postgresAssetRequestRepo.all();

  const visible = user.role === ROLES.IT_ADMIN || user.role === ROLES.HR_ADMIN
    ? rows
    : await scoped(user, rows);

  return Promise.all(visible.map(withEmployeeName));
}

export async function requestAsset(user, body) {
  requireFields(body, ['assetType', 'reason']);

  const row = await postgresAssetRequestRepo.insert({
    id: await postgresAssetRequestRepo.nextId(),
    employeeId: user.employeeId,
    assetType: body.assetType,
    reason: body.reason,
    status: ASSET_REQUEST_STATUS.PENDING_TL,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  await writeAudit({
    userId: user.id,
    action: 'asset.requested',
    module: 'assets',
    recordId: row.id,
  });

  return withEmployeeName(row);
}

export async function decideAssetRequest(user, id, { decision, note, assetId }) {
  const row = await postgresAssetRequestRepo.findById(id);
  if (!row) throw notFound('Asset request not found.');

  if (!['approve', 'reject'].includes(decision)) {
    throw badRequest('Decision must be approve or reject.');
  }

  const employee = await postgresEmployeeRepo.findById(row.employeeId);
  if (!employee) throw notFound('Employee not found.');

  const next = nextStatusAfterApproval({
    user,
    employee,
    status: row.status,
    chain: [
      { role: ROLES.TEAM_LEADER, status: ASSET_REQUEST_STATUS.PENDING_TL },
      { role: ROLES.PROCESS_MANAGER, status: ASSET_REQUEST_STATUS.PENDING_PM },
      { role: ROLES.IT_ADMIN, status: ASSET_REQUEST_STATUS.PENDING_IT },
    ],
    done: ASSET_REQUEST_STATUS.FULFILLED,
  });

  if (decision === 'reject') {
    const updated = await postgresAssetRequestRepo.update(id, {
      status: ASSET_REQUEST_STATUS.REJECTED,
      updatedAt: nowIso(),
    });

    await writeAudit({
      userId: user.id,
      action: 'asset.request_rejected',
      module: 'assets',
      recordId: id,
    });

    await notifyEmployee(row.employeeId, {
      title: 'Asset request rejected',
      body: note || 'Your request was rejected.',
      module: 'assets',
    });

    return withEmployeeName(updated);
  }

  if (user.role === ROLES.IT_ADMIN) {
    if (!assetId) throw badRequest('Select an available asset to assign.');

    const asset = await postgresAssetRepo.findById(assetId);

    if (!asset || asset.status !== 'available') {
      throw conflict('Asset is not available.');
    }

    await postgresAssetRepo.update(assetId, { status: 'assigned' });

    await postgresAssetAssignmentRepo.insert({
      id: await postgresAssetAssignmentRepo.nextId(),
      assetId,
      employeeId: row.employeeId,
      assignedAt: nowIso().slice(0, 10),
      returnedAt: null,
      assignedBy: user.employeeId,
    });

    await writeAudit({
      userId: user.id,
      action: 'asset.assigned',
      module: 'assets',
      recordId: assetId,
    });
  }

  const updated = await postgresAssetRequestRepo.update(id, {
    status: next,
    updatedAt: nowIso(),
  });

  await notifyEmployee(row.employeeId, {
    title: 'Asset request update',
    body: `Status: ${next.replaceAll('_', ' ')}`,
    module: 'assets',
  });

  return withEmployeeName(updated);
}

export async function addAsset(user, body) {
  requireFields(body, ['assetType', 'assetCode']);

  const code = body.assetCode.trim();
  const existing = (await postgresAssetRepo.all()).find(
    (asset) => asset.assetCode === code
  );

  if (existing) throw conflict('Asset code already exists.');

  const row = await postgresAssetRepo.insert({
    id: await postgresAssetRepo.nextId(),
    assetCode: code,
    assetType: body.assetType,
    serialNumber: body.serialNumber?.trim() || null,
    condition: body.condition || 'good',
    status: 'available',
  });

  await writeAudit({
    userId: user.id,
    action: 'asset.created',
    module: 'assets',
    recordId: row.id,
  });

  return decorateAsset(row);
}

export async function returnAsset(user, assetId) {
  const asset = await postgresAssetRepo.findById(assetId);
  if (!asset) throw notFound('Asset not found.');

  const assignment = await postgresAssetAssignmentRepo.findOne(
    (item) => item.assetId === assetId && !item.returnedAt
  );

  if (!assignment) throw conflict('This asset is not assigned to anyone.');

  await postgresAssetAssignmentRepo.update(assignment.id, {
    returnedAt: nowIso().slice(0, 10),
  });

  const updated = await postgresAssetRepo.update(assetId, {
    status: 'available',
  });

  await writeAudit({
    userId: user.id,
    action: 'asset.returned',
    module: 'assets',
    recordId: assetId,
  });

  await notifyEmployee(assignment.employeeId, {
    title: 'Asset returned',
    body: `${asset.assetCode} was marked as returned.`,
    module: 'assets',
  });

  return decorateAsset(updated);
}

// Grievances

export async function listGrievances(user) {
  const rows = await postgresGrievanceRepo.all();

  const visible = user.role === ROLES.HR_ADMIN
    ? rows
    : await scoped(user, rows);

  return Promise.all(
    visible.map(async (row) => ({
      ...row,
      employeeName: await nameOf(row.employeeId),
      comments: await postgresGrievanceCommentRepo.find(
        (comment) => comment.grievanceId === row.id
      ),
    }))
  );
}

export async function createGrievance(user, body) {
  requireFields(body, ['subject', 'description', 'category']);

  const row = await postgresGrievanceRepo.insert({
    id: await postgresGrievanceRepo.nextId(),
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

  await writeAudit({
    userId: user.id,
    action: 'grievance.created',
    module: 'grievances',
    recordId: row.id,
  });

  return {
    ...row,
    employeeName: await nameOf(row.employeeId),
    comments: [],
  };
}

export async function commentGrievance(user, id, body) {
  requireFields(body, ['body']);

  const row = await postgresGrievanceRepo.findById(id);
  if (!row) throw notFound('Grievance not found.');

  const isHr = user.role === ROLES.HR_ADMIN;

  if (!isHr && row.employeeId !== user.employeeId) {
    throw forbidden();
  }

  const comment = await postgresGrievanceCommentRepo.insert({
    id: await postgresGrievanceCommentRepo.nextId(),
    grievanceId: id,
    authorId: user.employeeId,
    body: body.body,
    createdAt: nowIso(),
  });

  await postgresGrievanceRepo.update(id, {
    status: isHr ? body.status || row.status : row.status,
    resolution: isHr ? body.resolution ?? row.resolution : row.resolution,
  });

  if (isHr) {
    await notifyEmployee(row.employeeId, {
      title: 'Grievance update',
      body: body.body,
      module: 'grievances',
    });
  }

  await writeAudit({
    userId: user.id,
    action: 'grievance.commented',
    module: 'grievances',
    recordId: id,
  });

  return comment;
}

// Reimbursements

export async function listReimbursements(user) {
  const rows = await postgresReimbursementRepo.all();
  const visible = await scoped(user, rows);

  return Promise.all(visible.map(withEmployeeName));
}

export async function submitReimbursement(user, body) {
  requireFields(body, ['expenseType', 'amount', 'expenseDate', 'description']);

  const row = await postgresReimbursementRepo.insert({
    id: await postgresReimbursementRepo.nextId(),
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

  await writeAudit({
    userId: user.id,
    action: 'reimbursement.submitted',
    module: 'reimbursements',
    recordId: row.id,
  });

  return withEmployeeName(row);
}

export async function decideReimbursement(user, id, { decision, note }) {
  const row = await postgresReimbursementRepo.findById(id);
  if (!row) throw notFound('Reimbursement not found.');

  if (!['approve', 'reject'].includes(decision)) {
    throw badRequest('Decision must be approve or reject.');
  }

  const employee = await postgresEmployeeRepo.findById(row.employeeId);
  if (!employee) throw notFound('Employee not found.');

  const next = nextStatusAfterApproval({
    user,
    employee,
    status: row.status,
    chain: [
      { role: ROLES.TEAM_LEADER, status: REIMBURSE_STATUS.PENDING_TL },
      { role: ROLES.PROCESS_MANAGER, status: REIMBURSE_STATUS.PENDING_PM },
      { role: ROLES.FINANCE, status: REIMBURSE_STATUS.PENDING_FINANCE },
    ],
    done: REIMBURSE_STATUS.PAID,
  });

  const status = decision === 'reject' ? REIMBURSE_STATUS.REJECTED : next;

  const updated = await postgresReimbursementRepo.update(id, {
    status,
    updatedAt: nowIso(),
  });

  await writeAudit({
    userId: user.id,
    action: decision === 'reject'
      ? 'reimbursement.rejected'
      : 'reimbursement.approved',
    module: 'reimbursements',
    recordId: id,
    meta: { note },
  });

  await notifyEmployee(row.employeeId, {
    title: 'Reimbursement update',
    body: `Status: ${status.replaceAll('_', ' ')}`,
    module: 'reimbursements',
  });

  return withEmployeeName(updated);
}

// Learning

export async function listLearning(user) {
  const rows = await postgresEmployeeCourseRepo.all();

  const assignments = [
    ROLES.HR_ADMIN,
    ROLES.PROCESS_MANAGER,
    ROLES.TEAM_LEADER,
  ].includes(user.role)
    ? await scoped(user, rows)
    : rows.filter((item) => item.employeeId === user.employeeId);

  return Promise.all(
    assignments.map(async (assignment) => {
      const course = await postgresCourseRepo.findById(assignment.courseId);

      return {
        ...assignment,
        courseTitle: course?.title,
        kind: course?.kind,
        hours: course?.hours,
        employeeName: await nameOf(assignment.employeeId),
      };
    })
  );
}

export async function listCourses() {
  return postgresCourseRepo.all();
}

export async function createCourse(user, body) {
  if (user.role !== ROLES.HR_ADMIN) throw forbidden();

  requireFields(body, ['title', 'kind']);

  return postgresCourseRepo.insert({
    id: await postgresCourseRepo.nextId(),
    title: body.title.trim(),
    kind: body.kind,
    hours: Number(body.hours || 0),
  });
}

export async function assignCourse(user, body) {
  requireFields(body, ['employeeId', 'courseId']);
  await assertEmployeeAccess(user, body.employeeId);

  const course = await postgresCourseRepo.findById(body.courseId);
  if (!course) throw notFound('Course not found.');

  const existing = (await postgresEmployeeCourseRepo.all()).find(
    (item) =>
      item.employeeId === body.employeeId &&
      item.courseId === body.courseId &&
      item.status !== 'completed'
  );

  if (existing) throw conflict('This course is already assigned to the employee.');

  const row = await postgresEmployeeCourseRepo.insert({
    id: await postgresEmployeeCourseRepo.nextId(),
    employeeId: body.employeeId,
    courseId: body.courseId,
    status: 'assigned',
    certificate: null,
    assignedBy: user.employeeId,
    completedAt: null,
  });

  await notifyEmployee(body.employeeId, {
    title: 'New learning assigned',
    body: `${course.title} was assigned to you.`,
    module: 'learning',
  });

  await writeAudit({
    userId: user.id,
    action: 'learning.assigned',
    module: 'learning',
    recordId: row.id,
  });

  return row;
}

export async function completeCourse(user, id) {
  const row = await postgresEmployeeCourseRepo.findById(id);
  if (!row) throw notFound('Assignment not found.');

  if (row.employeeId !== user.employeeId) throw forbidden();

  if (row.status === 'completed') {
    throw conflict('This course is already completed.');
  }

  const updated = await postgresEmployeeCourseRepo.update(id, {
    status: 'completed',
    completedAt: nowIso(),
    certificate: `CERT-${id}`,
  });

  await writeAudit({
    userId: user.id,
    action: 'learning.completed',
    module: 'learning',
    recordId: id,
  });

  return updated;
}

// Lookups and settings

export async function listLookups() {
  return {
    departments: await postgresDepartmentRepo.all(),
    designations: await postgresDesignationRepo.all(),
    settings: getSettings(),
  };
}

export async function saveSettings(user, body) {
  const updated = updateSettings(body);

  await writeAudit({
    userId: user.id,
    action: 'settings.updated',
    module: 'settings',
    recordId: 'company',
  });

  return updated;
}

// Global search

export async function searchAll(user, q) {
  const query = String(q || '').trim().toLowerCase();

  if (query.length < 2) {
    return { employees: [], departments: [], designations: [], assets: [], requests: [] };
  }

  const ids = await accessibleEmployeeIds(user);

  const [
    allEmployees,
    allDepartments,
    allDesignations,
    allAssets,
    allReimbursements,
    allLeaves,
  ] = await Promise.all([
    postgresEmployeeRepo.all(),
    postgresDepartmentRepo.all(),
    postgresDesignationRepo.all(),
    postgresAssetRepo.all(),
    postgresReimbursementRepo.all(),
    postgresLeaveRequests(),
  ]);

  const employees = allEmployees
    .filter((employee) => ids.includes(employee.id))
    .filter((employee) =>
      `${employee.firstName} ${employee.lastName} ${employee.email} ${employee.employeeCode} ${employee.id}`
        .toLowerCase()
        .includes(query)
    )
    .slice(0, 8)
    .map((employee) => ({
      type: 'employee',
      id: employee.id,
      label: `${employee.firstName} ${employee.lastName}`,
      sub: employee.employeeCode,
    }));

  const departments = allDepartments
    .filter((department) => department.name.toLowerCase().includes(query))
    .map((department) => ({
      type: 'department',
      id: department.id,
      label: department.name,
    }));

  const designations = allDesignations
    .filter((designation) => designation.name.toLowerCase().includes(query))
    .map((designation) => ({
      type: 'designation',
      id: designation.id,
      label: designation.name,
    }));

  const assets = allAssets
    .filter((asset) =>
      `${asset.assetCode || ''} ${asset.serialNumber || ''} ${asset.assetType || ''}`
        .toLowerCase()
        .includes(query)
    )
    .slice(0, 6)
    .map((asset) => ({
      type: 'asset',
      id: asset.id,
      label: asset.assetCode || asset.id,
      sub: asset.assetType,
    }));

  const requests = [
    ...allLeaves
      .filter((leave) => ids.includes(leave.employeeId))
      .filter((leave) =>
        `${leave.id} ${leave.leaveType || ''} ${leave.reason || ''}`
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 5)
      .map((leave) => ({
        type: 'leave',
        id: leave.id,
        label: leave.id,
        sub: leave.status,
      })),
    ...allReimbursements
      .filter((item) => ids.includes(item.employeeId))
      .filter((item) =>
        `${item.id} ${item.expenseType || ''} ${item.description || ''}`
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 5)
      .map((item) => ({
        type: 'reimbursement',
        id: item.id,
        label: item.id,
        sub: item.status,
      })),
  ];

  return { employees, departments, designations, assets, requests };
}

async function postgresLeaveRequests() {
  const { postgresLeaveRepo } = await import(
    '../repositories/postgres/leave.repository.js'
  );

  return postgresLeaveRepo.all();
}