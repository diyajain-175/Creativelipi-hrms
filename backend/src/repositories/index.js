import { db } from './mock/store.js';
import { collection } from './mock/memory.js';

export const userRepo = {
  ...collection(db.users),
  findByEmail(email) {
    return db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase()) || null;
  },
  findByEmployeeId(employeeId) {
    return db.users.find((u) => u.employeeId === employeeId) || null;
  },
};

export const employeeRepo = collection(db.employees);
export const departmentRepo = collection(db.departments);
export const designationRepo = collection(db.designations);
export const attendanceRepo = collection(db.attendance);
export const leaveBalanceRepo = collection(db.leaveBalances);
export const leaveRepo = collection(db.leaveRequests);
export const payrollRepo = collection(db.payroll);
export const incentiveRepo = collection(db.incentives);
export const rewardRepo = collection(db.rewards);
export const penaltyRepo = collection(db.penalties);
export const goalRepo = collection(db.goals);
export const reviewRepo = collection(db.performanceReviews);
export const assetRepo = collection(db.assets);
export const assetAssignmentRepo = collection(db.assetAssignments);
export const assetRequestRepo = collection(db.assetRequests);
export const grievanceRepo = collection(db.grievances);
export const grievanceCommentRepo = collection(db.grievanceComments);
export const reimbursementRepo = collection(db.reimbursements);
export const courseRepo = collection(db.learningCourses);
export const employeeCourseRepo = collection(db.employeeCourses);
export const notificationRepo = collection(db.notifications);
export const auditRepo = collection(db.auditLogs);

export function getSettings() {
  return db.settings;
}

export function updateSettings(patch) {
  Object.assign(db.settings, patch);
  return db.settings;
}
