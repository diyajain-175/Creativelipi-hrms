import bcrypt from 'bcryptjs';
import { ROLES } from '../../config/roles.js';
import { LEAVE_STATUS, REIMBURSE_STATUS, INCENTIVE_STATUS, ASSET_REQUEST_STATUS } from '../../config/workflows.js';

const passwordHash = bcrypt.hashSync('password123', 10);

const departments = [
  { id: 'dept-creative', name: 'Creative Operations' },
  { id: 'dept-sales', name: 'Sales' },
  { id: 'dept-hr', name: 'Human Resources' },
  { id: 'dept-finance', name: 'Finance' },
  { id: 'dept-it', name: 'Information Technology' },
];

const designations = [
  { id: 'des-associate', name: 'Content Associate', departmentId: 'dept-creative' },
  { id: 'des-tl', name: 'Team Leader', departmentId: 'dept-creative' },
  { id: 'des-pm', name: 'Process Manager', departmentId: 'dept-creative' },
  { id: 'des-hr', name: 'HR Manager', departmentId: 'dept-hr' },
  { id: 'des-fin', name: 'Finance Executive', departmentId: 'dept-finance' },
  { id: 'des-it', name: 'IT Administrator', departmentId: 'dept-it' },
];

function emp(partial) {
  return {
    phone: '',
    location: 'Pune',
    employmentStatus: 'active',
    bankName: 'HDFC Bank',
    bankAccount: '****4821',
    ifsc: 'HDFC0001234',
    documents: [],
    ...partial,
  };
}

const employees = [
  emp({
    id: 'EMP-1001',
    employeeCode: 'CL-1001',
    firstName: 'Asha',
    lastName: 'Verma',
    email: 'asha@hrms.com',
    phone: '9876501001',
    departmentId: 'dept-creative',
    designationId: 'des-associate',
    role: ROLES.EMPLOYEE,
    teamLeaderId: 'EMP-2001',
    processManagerId: 'EMP-3001',
    joiningDate: '2023-04-12',
    basicSalary: 32000,
    allowances: 8000,
    documents: [
      { name: 'PAN Card', status: 'verified' },
      { name: 'Aadhaar', status: 'verified' },
    ],
  }),
  emp({
    id: 'EMP-1002',
    employeeCode: 'CL-1002',
    firstName: 'Priya',
    lastName: 'Nair',
    email: 'priya@hrms.com',
    phone: '9876501002',
    departmentId: 'dept-creative',
    designationId: 'des-associate',
    role: ROLES.EMPLOYEE,
    teamLeaderId: 'EMP-2001',
    processManagerId: 'EMP-3001',
    joiningDate: '2022-11-03',
    basicSalary: 34000,
    allowances: 8500,
  }),
  emp({
    id: 'EMP-1003',
    employeeCode: 'CL-1003',
    firstName: 'Vikram',
    lastName: 'Shah',
    email: 'vikram@hrms.com',
    phone: '9876501003',
    departmentId: 'dept-creative',
    designationId: 'des-associate',
    role: ROLES.EMPLOYEE,
    teamLeaderId: 'EMP-2001',
    processManagerId: 'EMP-3001',
    joiningDate: '2024-01-18',
    basicSalary: 30000,
    allowances: 7000,
  }),
  emp({
    id: 'EMP-1004',
    employeeCode: 'CL-1004',
    firstName: 'Meera',
    lastName: 'Joshi',
    email: 'meera@hrms.com',
    phone: '9876501004',
    departmentId: 'dept-creative',
    designationId: 'des-associate',
    role: ROLES.EMPLOYEE,
    teamLeaderId: 'EMP-2002',
    processManagerId: 'EMP-3001',
    joiningDate: '2023-08-21',
    basicSalary: 31000,
    allowances: 7500,
  }),
  emp({
    id: 'EMP-1005',
    employeeCode: 'CL-1005',
    firstName: 'Arjun',
    lastName: 'Patel',
    email: 'arjun@hrms.com',
    phone: '9876501005',
    departmentId: 'dept-sales',
    designationId: 'des-associate',
    role: ROLES.EMPLOYEE,
    teamLeaderId: 'EMP-2002',
    processManagerId: 'EMP-3001',
    joiningDate: '2021-06-09',
    location: 'Mumbai',
    basicSalary: 36000,
    allowances: 9000,
  }),
  emp({
    id: 'EMP-2001',
    employeeCode: 'CL-2001',
    firstName: 'Rohit',
    lastName: 'Mehra',
    email: 'rohit@hrms.com',
    phone: '9876502001',
    departmentId: 'dept-creative',
    designationId: 'des-tl',
    role: ROLES.TEAM_LEADER,
    teamLeaderId: null,
    processManagerId: 'EMP-3001',
    joiningDate: '2020-02-14',
    basicSalary: 52000,
    allowances: 14000,
  }),
  emp({
    id: 'EMP-2002',
    employeeCode: 'CL-2002',
    firstName: 'Ananya',
    lastName: 'Iyer',
    email: 'ananya@hrms.com',
    phone: '9876502002',
    departmentId: 'dept-creative',
    designationId: 'des-tl',
    role: ROLES.TEAM_LEADER,
    teamLeaderId: null,
    processManagerId: 'EMP-3001',
    joiningDate: '2019-09-02',
    basicSalary: 54000,
    allowances: 15000,
  }),
  emp({
    id: 'EMP-3001',
    employeeCode: 'CL-3001',
    firstName: 'Neha',
    lastName: 'Kapoor',
    email: 'neha@hrms.com',
    phone: '9876503001',
    departmentId: 'dept-creative',
    designationId: 'des-pm',
    role: ROLES.PROCESS_MANAGER,
    teamLeaderId: null,
    processManagerId: null,
    joiningDate: '2018-05-11',
    basicSalary: 78000,
    allowances: 22000,
  }),
  emp({
    id: 'EMP-4001',
    employeeCode: 'CL-4001',
    firstName: 'Sanjay',
    lastName: 'Rao',
    email: 'sanjay@hrms.com',
    phone: '9876504001',
    departmentId: 'dept-hr',
    designationId: 'des-hr',
    role: ROLES.HR_ADMIN,
    teamLeaderId: null,
    processManagerId: null,
    joiningDate: '2017-01-16',
    location: 'Pune',
    basicSalary: 86000,
    allowances: 24000,
  }),
  emp({
    id: 'EMP-5001',
    employeeCode: 'CL-5001',
    firstName: 'Kiran',
    lastName: 'Das',
    email: 'kiran@hrms.com',
    phone: '9876505001',
    departmentId: 'dept-finance',
    designationId: 'des-fin',
    role: ROLES.FINANCE,
    teamLeaderId: null,
    processManagerId: null,
    joiningDate: '2019-03-04',
    basicSalary: 62000,
    allowances: 16000,
  }),
  emp({
    id: 'EMP-6001',
    employeeCode: 'CL-6001',
    firstName: 'Imran',
    lastName: 'Khan',
    email: 'imran@hrms.com',
    phone: '9876506001',
    departmentId: 'dept-it',
    designationId: 'des-it',
    role: ROLES.IT_ADMIN,
    teamLeaderId: null,
    processManagerId: null,
    joiningDate: '2020-07-27',
    basicSalary: 58000,
    allowances: 12000,
  }),
];

const users = employees.map((e) => ({
  id: `USR-${e.id.slice(4)}`,
  email: e.email,
  passwordHash,
  role: e.role,
  employeeId: e.id,
  isActive: e.employmentStatus === 'active',
}));

const today = new Date().toISOString().slice(0, 10);

const attendance = [
  { id: 'ATT-1', employeeId: 'EMP-1001', workDate: today, checkIn: '09:12', checkOut: null, status: 'present', workingMinutes: 0, overtimeMinutes: 0, source: 'manual' },
  { id: 'ATT-2', employeeId: 'EMP-1002', workDate: today, checkIn: '09:02', checkOut: null, status: 'present', workingMinutes: 0, overtimeMinutes: 0, source: 'manual' },
  { id: 'ATT-3', employeeId: 'EMP-1003', workDate: today, checkIn: null, checkOut: null, status: 'leave', workingMinutes: 0, overtimeMinutes: 0, source: 'system' },
  { id: 'ATT-4', employeeId: 'EMP-1004', workDate: today, checkIn: '10:21', checkOut: null, status: 'late', workingMinutes: 0, overtimeMinutes: 0, source: 'manual' },
  { id: 'ATT-5', employeeId: 'EMP-2001', workDate: today, checkIn: '08:58', checkOut: null, status: 'present', workingMinutes: 0, overtimeMinutes: 0, source: 'manual' },
];

const leaveBalances = employees.flatMap((e) => [
  { id: `LB-${e.id}-casual`, employeeId: e.id, leaveType: 'casual', balance: 8 },
  { id: `LB-${e.id}-sick`, employeeId: e.id, leaveType: 'sick', balance: 6 },
  { id: `LB-${e.id}-earned`, employeeId: e.id, leaveType: 'earned', balance: 11 },
  { id: `LB-${e.id}-long`, employeeId: e.id, leaveType: 'long', balance: 0 },
]);

const leaveRequests = [
  {
    id: 'LV-101',
    employeeId: 'EMP-1001',
    leaveType: 'casual',
    startDate: '2026-10-24',
    endDate: '2026-10-24',
    days: 1,
    reason: 'Family appointment',
    status: LEAVE_STATUS.PENDING_TL,
    decidedBy: null,
    decisionNote: '',
    createdAt: '2026-10-20T08:12:00.000Z',
    updatedAt: '2026-10-20T08:12:00.000Z',
  },
  {
    id: 'LV-102',
    employeeId: 'EMP-1002',
    leaveType: 'sick',
    startDate: '2026-10-21',
    endDate: '2026-10-21',
    days: 1,
    reason: 'Fever',
    status: LEAVE_STATUS.PENDING_PM,
    decidedBy: 'EMP-2001',
    decisionNote: 'Forwarded',
    createdAt: '2026-10-19T11:00:00.000Z',
    updatedAt: '2026-10-20T09:00:00.000Z',
  },
  {
    id: 'LV-103',
    employeeId: 'EMP-1003',
    leaveType: 'casual',
    startDate: today,
    endDate: today,
    days: 1,
    reason: 'Personal work',
    status: LEAVE_STATUS.APPROVED,
    decidedBy: 'EMP-3001',
    decisionNote: 'Approved',
    createdAt: '2026-10-18T10:00:00.000Z',
    updatedAt: '2026-10-19T10:00:00.000Z',
  },
];

const payroll = [
  {
    id: 'PAY-1001-2026-09',
    employeeId: 'EMP-1001',
    period: '2026-09',
    basic: 32000,
    allowances: 8000,
    incentives: 2500,
    bonus: 0,
    deductions: 1200,
    penalties: 0,
    net: 41300,
    status: 'paid',
    createdAt: '2026-09-30T10:00:00.000Z',
  },
  {
    id: 'PAY-1001-2026-10',
    employeeId: 'EMP-1001',
    period: '2026-10',
    basic: 32000,
    allowances: 8000,
    incentives: 0,
    bonus: 0,
    deductions: 1200,
    penalties: 0,
    net: 38800,
    status: 'draft',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
];

employees
  .filter((e) => e.id !== 'EMP-1001')
  .forEach((e) => {
    payroll.push({
      id: `PAY-${e.id}-2026-09`,
      employeeId: e.id,
      period: '2026-09',
      basic: e.basicSalary,
      allowances: e.allowances,
      incentives: 0,
      bonus: 0,
      deductions: Math.round(e.basicSalary * 0.04),
      penalties: 0,
      net: e.basicSalary + e.allowances - Math.round(e.basicSalary * 0.04),
      status: 'paid',
      createdAt: '2026-09-30T10:00:00.000Z',
    });
  });

const incentives = [
  {
    id: 'INC-1',
    employeeId: 'EMP-1001',
    ruleCode: 'quality',
    amount: 2500,
    points: 25,
    reason: 'Quality score above 95% in September',
    period: '2026-09',
    recommendedBy: 'EMP-2001',
    approvedBy: 'EMP-3001',
    status: INCENTIVE_STATUS.APPROVED,
    createdAt: '2026-09-28T12:00:00.000Z',
  },
  {
    id: 'INC-2',
    employeeId: 'EMP-1002',
    ruleCode: 'productivity',
    amount: 1500,
    points: 15,
    reason: 'Exceeded weekly throughput target',
    period: '2026-10',
    recommendedBy: 'EMP-2001',
    approvedBy: null,
    status: INCENTIVE_STATUS.PENDING_PM,
    createdAt: '2026-10-18T12:00:00.000Z',
  },
];

const rewards = [
  {
    id: 'RWD-1',
    employeeId: 'EMP-1001',
    title: 'Star of the Month',
    category: 'monthly',
    points: 50,
    period: '2026-09',
    awardedBy: 'EMP-3001',
    createdAt: '2026-09-30T16:00:00.000Z',
  },
];

const penalties = [
  {
    id: 'PEN-1',
    employeeId: 'EMP-1004',
    reason: 'Repeated late check-in',
    amount: 500,
    penaltyDate: '2026-10-15',
    period: '2026-10',
    addedBy: 'EMP-4001',
    status: 'approved',
    createdAt: '2026-10-15T11:00:00.000Z',
  },
];

const goals = [
  {
    id: 'GOAL-1',
    employeeId: 'EMP-1001',
    title: 'Quality accuracy',
    kpi: 'Error rate below 2%',
    period: '2026-Q4',
    target: '< 2%',
    progress: 70,
    createdAt: '2026-10-01T09:00:00.000Z',
  },
];

const performanceReviews = [
  {
    id: 'PR-1',
    employeeId: 'EMP-1001',
    period: '2026-09',
    score: 4.2,
    managerFeedback: 'Reliable on quality. Improve turnaround on peak days.',
    employeeFeedback: 'Need clearer briefing on rush jobs.',
    reviewerId: 'EMP-2001',
    createdAt: '2026-09-30T14:00:00.000Z',
  },
];

const assets = [
  { id: 'AST-1', assetCode: 'CL-LAP-014', assetType: 'laptop', serialNumber: 'DL-88A21', condition: 'good', status: 'assigned' },
  { id: 'AST-2', assetCode: 'CL-MON-009', assetType: 'monitor', serialNumber: 'LG-4410', condition: 'good', status: 'assigned' },
  { id: 'AST-3', assetCode: 'CL-LAP-022', assetType: 'laptop', serialNumber: 'DL-99B10', condition: 'good', status: 'available' },
];

const assetAssignments = [
  { id: 'AA-1', assetId: 'AST-1', employeeId: 'EMP-1001', assignedAt: '2024-02-01', returnedAt: null, assignedBy: 'EMP-6001' },
  { id: 'AA-2', assetId: 'AST-2', employeeId: 'EMP-1001', assignedAt: '2024-02-01', returnedAt: null, assignedBy: 'EMP-6001' },
];

const assetRequests = [
  {
    id: 'AR-1',
    employeeId: 'EMP-1002',
    assetType: 'keyboard',
    reason: 'Current keyboard keys sticking',
    status: ASSET_REQUEST_STATUS.PENDING_TL,
    createdAt: '2026-10-19T10:00:00.000Z',
    updatedAt: '2026-10-19T10:00:00.000Z',
  },
];

const grievances = [
  {
    id: 'GRV-1',
    employeeId: 'EMP-1001',
    subject: 'Shift roster clash',
    description: 'Weekend roster overlaps with approved leave pattern.',
    category: 'workplace',
    priority: 'medium',
    status: 'in_review',
    assignedTo: 'HR',
    resolution: '',
    createdAt: '2026-10-12T09:30:00.000Z',
    updatedAt: '2026-10-13T11:00:00.000Z',
  },
];

const grievanceComments = [
  { id: 'GC-1', grievanceId: 'GRV-1', authorId: 'EMP-4001', body: 'Reviewing with operations this week.', createdAt: '2026-10-13T11:00:00.000Z' },
];

const reimbursements = [
  {
    id: 'RMB-1',
    employeeId: 'EMP-1001',
    expenseType: 'travel',
    amount: 840,
    expenseDate: '2026-10-08',
    description: 'Client office commute',
    receiptName: 'cab-receipt.pdf',
    status: REIMBURSE_STATUS.PENDING_FINANCE,
    createdAt: '2026-10-09T08:00:00.000Z',
    updatedAt: '2026-10-16T10:00:00.000Z',
  },
];

const learningCourses = [
  { id: 'CRS-1', title: 'Quality guidelines 2026', kind: 'course', hours: 4 },
  { id: 'CRS-2', title: 'Workplace conduct', kind: 'workshop', hours: 2 },
];

const employeeCourses = [
  { id: 'EC-1', employeeId: 'EMP-1001', courseId: 'CRS-1', status: 'in_progress', certificate: null, assignedBy: 'EMP-4001', completedAt: null },
  { id: 'EC-2', employeeId: 'EMP-1001', courseId: 'CRS-2', status: 'completed', certificate: 'WC-2026-1001', assignedBy: 'EMP-4001', completedAt: '2026-09-12T00:00:00.000Z' },
];

const notifications = [
  {
    id: 'NTF-1',
    userId: 'USR-1001',
    title: 'Leave submitted',
    body: 'Your casual leave for 24 Oct is waiting for Team Leader review.',
    module: 'leave',
    isRead: false,
    createdAt: '2026-10-20T08:12:00.000Z',
  },
];

const auditLogs = [
  {
    id: 'AUD-1',
    userId: 'USR-1001',
    action: 'leave.submitted',
    module: 'leave',
    recordId: 'LV-101',
    meta: {},
    createdAt: '2026-10-20T08:12:00.000Z',
  },
];

const settings = {
  companyName: 'CreativeLipi',
  workStart: '09:00',
  lateAfter: '09:15',
  fullDayMinutes: 480,
  payrollFormula: {
    net: 'basic + allowances + incentives + bonus - deductions - penalties',
  },
  leavePolicies: [
    { leaveType: 'casual', annual: 12, requiresHr: false },
    { leaveType: 'sick', annual: 8, requiresHr: false },
    { leaveType: 'earned', annual: 15, requiresHr: false },
    { leaveType: 'long', annual: 0, requiresHr: true },
  ],
};

export const db = {
  departments,
  designations,
  employees,
  users,
  attendance,
  leaveBalances,
  leaveRequests,
  payroll,
  incentives,
  rewards,
  penalties,
  goals,
  performanceReviews,
  assets,
  assetAssignments,
  assetRequests,
  grievances,
  grievanceComments,
  reimbursements,
  learningCourses,
  employeeCourses,
  notifications,
  auditLogs,
  settings,
};
