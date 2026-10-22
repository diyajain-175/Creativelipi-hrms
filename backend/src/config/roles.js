export const ROLES = {
  EMPLOYEE: 'employee',
  TEAM_LEADER: 'team_leader',
  PROCESS_MANAGER: 'process_manager',
  HR_ADMIN: 'hr_admin',
  FINANCE: 'finance',
  IT_ADMIN: 'it_admin',
};

export const ROLE_LABELS = {
  [ROLES.EMPLOYEE]: 'Employee',
  [ROLES.TEAM_LEADER]: 'Team Leader',
  [ROLES.PROCESS_MANAGER]: 'Process Manager',
  [ROLES.HR_ADMIN]: 'HR Admin',
  [ROLES.FINANCE]: 'Finance',
  [ROLES.IT_ADMIN]: 'IT Admin',
};

export const ALL_ROLES = Object.values(ROLES);
