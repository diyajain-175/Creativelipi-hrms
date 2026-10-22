export const LEAVE_STATUS = {
  PENDING_TL: 'pending_team_leader',
  PENDING_PM: 'pending_process_manager',
  PENDING_HR: 'pending_hr',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const REIMBURSE_STATUS = {
  PENDING_TL: 'pending_team_leader',
  PENDING_PM: 'pending_process_manager',
  PENDING_FINANCE: 'pending_finance',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid',
};

export const ASSET_REQUEST_STATUS = {
  PENDING_TL: 'pending_team_leader',
  PENDING_PM: 'pending_process_manager',
  PENDING_IT: 'pending_it',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FULFILLED: 'fulfilled',
};

export const INCENTIVE_STATUS = {
  PENDING_PM: 'pending_process_manager',
  PENDING_HR: 'pending_hr',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const LEAVE_TYPES = [
  { code: 'casual', name: 'Casual Leave', defaultBalance: 12 },
  { code: 'sick', name: 'Sick Leave', defaultBalance: 8 },
  { code: 'earned', name: 'Earned Leave', defaultBalance: 15 },
  { code: 'long', name: 'Long Leave', defaultBalance: 0, requiresHr: true },
  { code: 'other', name: 'Other', defaultBalance: 0 },
];

export const PAYROLL_FORMULA = {
  net: ['basic', 'allowances', 'incentives', 'bonus', '-deductions', '-penalties'],
};
