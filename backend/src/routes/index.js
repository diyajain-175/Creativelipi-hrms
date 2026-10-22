import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { PERMISSIONS as P } from '../config/permissions.js';
import { wrap } from '../controllers/http.js';
import { loginHandler, logoutHandler, meHandler } from '../controllers/auth.controller.js';
import * as employees from '../services/employee.service.js';
import * as profile from '../services/profile.service.js';
import * as attendance from '../services/attendance.service.js';
import * as leave from '../services/leave.service.js';
import * as payroll from '../services/payroll.service.js';
import * as modules from '../services/modules.service.js';
import * as dashboard from '../services/dashboard.service.js';
import * as notifications from '../services/notification.service.js';
import * as reports from '../services/report.service.js';
import * as audit from '../services/audit.service.js';
import { LEAVE_TYPES } from '../config/workflows.js';

const router = Router();

router.post('/auth/login', wrap(loginHandler));
router.post('/auth/logout', logoutHandler);
router.get('/auth/me', requireAuth, wrap(meHandler));

router.use(requireAuth);

router.get('/dashboard', wrap(async (req, res) => {
  res.json(dashboard.buildDashboard(req.user));
}));

router.get('/employees/me', wrap(async (req, res) => {
  res.json(profile.fullProfile(req.user, req.user.employeeId));
}));

router.get('/employees', requirePermission(P.EMPLOYEES_READ_TEAM, P.EMPLOYEES_READ_PROCESS, P.EMPLOYEES_READ_ALL), wrap(async (req, res) => {
  res.json(employees.listEmployees(req.user, req.query));
}));

router.post('/employees', requirePermission(P.EMPLOYEES_WRITE), wrap(async (req, res) => {
  res.status(201).json(employees.createEmployee(req.user, req.body));
}));

router.get('/employees/:id', wrap(async (req, res) => {
  res.json(profile.fullProfile(req.user, req.params.id));
}));

router.patch('/employees/:id', requirePermission(P.EMPLOYEES_WRITE), wrap(async (req, res) => {
  res.json(employees.updateEmployee(req.user, req.params.id, req.body));
}));

router.get('/attendance', requirePermission(P.ATTENDANCE_SELF, P.ATTENDANCE_TEAM, P.ATTENDANCE_PROCESS, P.ATTENDANCE_ALL), wrap(async (req, res) => {
  res.json(attendance.listAttendance(req.user, req.query));
}));

router.post('/attendance/check-in', requirePermission(P.ATTENDANCE_SELF), wrap(async (req, res) => {
  res.json(attendance.checkIn(req.user));
}));

router.post('/attendance/check-out', requirePermission(P.ATTENDANCE_SELF), wrap(async (req, res) => {
  res.json(attendance.checkOut(req.user));
}));

router.post('/attendance/import', requirePermission(P.ATTENDANCE_IMPORT), wrap(async (req, res) => {
  res.json(attendance.importRows(req.user, req.body.rows));
}));

router.get('/leave/types', wrap(async (_req, res) => {
  res.json(LEAVE_TYPES);
}));

router.get('/leave/balances', wrap(async (req, res) => {
  res.json(leave.balancesFor(req.user.employeeId));
}));

router.get('/leave', wrap(async (req, res) => {
  res.json(leave.listLeave(req.user, req.query));
}));

router.post('/leave', requirePermission(P.LEAVE_SELF), wrap(async (req, res) => {
  res.status(201).json(leave.applyLeave(req.user, req.body));
}));

router.patch('/leave/:id/decision', wrap(async (req, res) => {
  res.json(leave.decideLeave(req.user, req.params.id, req.body));
}));

router.get('/payroll', wrap(async (req, res) => {
  res.json(payroll.listPayroll(req.user, req.query));
}));

router.get('/payroll/:employeeId', wrap(async (req, res) => {
  res.json(payroll.getPayrollForEmployee(req.user, req.params.employeeId));
}));

router.post('/payroll/generate', requirePermission(P.PAYROLL_MANAGE), wrap(async (req, res) => {
  res.json(payroll.generatePayroll(req.user, req.body.period));
}));

router.patch('/payroll/:id/paid', requirePermission(P.PAYROLL_MANAGE), wrap(async (req, res) => {
  res.json(payroll.markPaid(req.user, req.params.id));
}));

router.get('/incentives', wrap(async (req, res) => {
  res.json(modules.listIncentives(req.user));
}));
router.post('/incentives', requirePermission(P.INCENTIVES_RECOMMEND, P.INCENTIVES_APPROVE), wrap(async (req, res) => {
  res.status(201).json(modules.recommendIncentive(req.user, req.body));
}));
router.patch('/incentives/:id/decision', requirePermission(P.INCENTIVES_APPROVE), wrap(async (req, res) => {
  res.json(modules.decideIncentive(req.user, req.params.id, req.body));
}));

router.get('/rewards', wrap(async (req, res) => {
  res.json(modules.listRewards(req.user));
}));
router.post('/rewards', requirePermission(P.REWARDS_MANAGE), wrap(async (req, res) => {
  res.status(201).json(modules.createReward(req.user, req.body));
}));

router.get('/penalties', requirePermission(P.PENALTIES_READ, P.PENALTIES_MANAGE), wrap(async (req, res) => {
  res.json(modules.listPenalties(req.user));
}));
router.post('/penalties', requirePermission(P.PENALTIES_MANAGE), wrap(async (req, res) => {
  res.status(201).json(modules.createPenalty(req.user, req.body));
}));
router.patch('/penalties/:id/decision', requirePermission(P.PENALTIES_MANAGE), wrap(async (req, res) => {
  res.json(modules.decidePenalty(req.user, req.params.id, req.body));
}));

router.get('/performance/goals', wrap(async (req, res) => {
  res.json(modules.listGoals(req.user, req.query.employeeId));
}));
router.get('/performance/reviews', wrap(async (req, res) => {
  res.json(modules.listReviews(req.user, req.query.employeeId));
}));
router.post('/performance/reviews', requirePermission(P.PERFORMANCE_TEAM, P.PERFORMANCE_PROCESS, P.PERFORMANCE_ALL), wrap(async (req, res) => {
  res.status(201).json(modules.upsertReview(req.user, req.body));
}));

router.get('/assets', wrap(async (req, res) => {
  res.json(modules.listAssets(req.user));
}));
router.get('/assets/requests', wrap(async (req, res) => {
  res.json(modules.listAssetRequests(req.user));
}));
router.post('/assets/requests', requirePermission(P.ASSETS_REQUEST), wrap(async (req, res) => {
  res.status(201).json(modules.requestAsset(req.user, req.body));
}));
router.patch('/assets/requests/:id/decision', wrap(async (req, res) => {
  res.json(modules.decideAssetRequest(req.user, req.params.id, req.body));
}));

router.get('/grievances', wrap(async (req, res) => {
  res.json(modules.listGrievances(req.user));
}));
router.post('/grievances', requirePermission(P.GRIEVANCES_SELF), wrap(async (req, res) => {
  res.status(201).json(modules.createGrievance(req.user, req.body));
}));
router.post('/grievances/:id/comments', wrap(async (req, res) => {
  res.status(201).json(modules.commentGrievance(req.user, req.params.id, req.body));
}));

router.get('/reimbursements', wrap(async (req, res) => {
  res.json(modules.listReimbursements(req.user));
}));
router.post('/reimbursements', requirePermission(P.REIMBURSE_SELF), wrap(async (req, res) => {
  res.status(201).json(modules.submitReimbursement(req.user, req.body));
}));
router.patch('/reimbursements/:id/decision', wrap(async (req, res) => {
  res.json(modules.decideReimbursement(req.user, req.params.id, req.body));
}));

router.get('/learning', wrap(async (req, res) => {
  res.json(modules.listLearning(req.user));
}));
router.get('/learning/courses', wrap(async (req, res) => {
  res.json(modules.listCourses());
}));
router.post('/learning/assign', requirePermission(P.LEARNING_ASSIGN), wrap(async (req, res) => {
  res.status(201).json(modules.assignCourse(req.user, req.body));
}));
router.post('/learning/:id/complete', wrap(async (req, res) => {
  res.json(modules.completeCourse(req.user, req.params.id));
}));

router.get('/notifications', wrap(async (req, res) => {
  res.json(notifications.listNotifications(req.user.id));
}));
router.patch('/notifications/:id/read', wrap(async (req, res) => {
  res.json(notifications.markRead(req.user.id, req.params.id));
}));

router.get('/search', requirePermission(P.SEARCH), wrap(async (req, res) => {
  res.json(modules.searchAll(req.user, req.query.q));
}));

router.get('/reports/:type', wrap(async (req, res) => {
  const rows = reports.runReport(req.user, req.params.type, req.query);
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${req.params.type}.csv`);
    return res.send(reports.toCsv(rows));
  }
  res.json(rows);
}));

router.get('/lookups', wrap(async (_req, res) => {
  res.json(modules.listLookups());
}));

router.patch('/settings', requirePermission(P.SETTINGS_MANAGE), wrap(async (req, res) => {
  res.json(modules.saveSettings(req.user, req.body));
}));

router.get('/audit', requirePermission(P.AUDIT_READ), wrap(async (_req, res) => {
  res.json(audit.listAudit());
}));

export default router;
