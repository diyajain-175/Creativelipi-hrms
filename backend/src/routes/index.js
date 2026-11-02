
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { PERMISSIONS as P } from '../config/permissions.js';
import { wrap } from '../controllers/http.js';
import {
  loginHandler,
  logoutHandler,
  meHandler,
} from '../controllers/auth.controller.js';

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
  res.json(await dashboard.buildDashboard(req.user));
}));

router.get('/employees/me', wrap(async (req, res) => {
  res.json(
    await profile.fullProfile(req.user, req.user.employeeId)
  );
}));

router.get(
  '/employees',
  requirePermission(
    P.EMPLOYEES_READ_TEAM,
    P.EMPLOYEES_READ_PROCESS,
    P.EMPLOYEES_READ_ALL
  ),
  wrap(async (req, res) => {
    res.json(
      await employees.listEmployees(req.user, req.query)
    );
  })
);

router.get('/employees/:id', wrap(async (req, res) => {
  res.json(
    await profile.fullProfile(req.user, req.params.id)
  );
}));

router.patch(
  '/employees/:id',
  requirePermission(P.EMPLOYEES_WRITE),
  wrap(async (req, res) => {
    res.json(
      await employees.updateEmployee(
        req.user,
        req.params.id,
        req.body
      )
    );
  })
);

router.get(
  '/attendance',
  requirePermission(
    P.ATTENDANCE_SELF,
    P.ATTENDANCE_TEAM,
    P.ATTENDANCE_PROCESS,
    P.ATTENDANCE_ALL
  ),
  wrap(async (req, res) => {
    res.json(await attendance.listAttendance(req.user, req.query));
  })
);

router.post(
  '/attendance/check-in',
  requirePermission(P.ATTENDANCE_SELF),
  wrap(async (req, res) => {
    res.json(await attendance.checkIn(req.user));
  })
);

router.post(
  '/attendance/check-out',
  requirePermission(P.ATTENDANCE_SELF),
  wrap(async (req, res) => {
    res.json(await attendance.checkOut(req.user));
  })
);

router.post(
  '/attendance/import',
  requirePermission(P.ATTENDANCE_IMPORT),
  wrap(async (req, res) => {
    res.json(await attendance.importRows(req.user, req.body.rows));
  })
);

router.get('/leave/types', wrap(async (_req, res) => {
  res.json(LEAVE_TYPES);
}));

router.get('/leave/balances', wrap(async (req, res) => {
  res.json(await leave.balancesFor(req.user.employeeId));
}));

router.get('/leave', wrap(async (req, res) => {
  res.json(await leave.listLeave(req.user, req.query));
}));

router.post(
  '/leave',
  requirePermission(P.LEAVE_SELF),
  wrap(async (req, res) => {
    res.status(201).json(
      await leave.applyLeave(req.user, req.body)
    );
  })
);

router.patch('/leave/:id/decision', wrap(async (req, res) => {
  res.json(
    await leave.decideLeave(req.user, req.params.id, req.body)
  );
}));

router.get('/payroll', wrap(async (req, res) => {
  res.json(await payroll.listPayroll(req.user, req.query));
}));

router.get('/payroll/:employeeId', wrap(async (req, res) => {
  res.json(
    await payroll.getPayrollForEmployee(req.user, req.params.employeeId)
  );
}));

router.post(
  '/payroll/generate',
  requirePermission(P.PAYROLL_MANAGE),
  wrap(async (req, res) => {
    res.json(await payroll.generatePayroll(req.user, req.body.period));
  })
);

router.patch(
  '/payroll/:id/paid',
  requirePermission(P.PAYROLL_MANAGE),
  wrap(async (req, res) => {
    res.json(await payroll.markPaid(req.user, req.params.id));
  })
);

router.get('/incentives', wrap(async (req, res) => {
  res.json(await modules.listIncentives(req.user));
}));

router.post(
  '/incentives',
  requirePermission(P.INCENTIVES_RECOMMEND, P.INCENTIVES_APPROVE),
  wrap(async (req, res) => {
    res.status(201).json(
      await modules.recommendIncentive(req.user, req.body)
    );
  })
);

router.patch(
  '/incentives/:id/decision',
  requirePermission(P.INCENTIVES_APPROVE),
  wrap(async (req, res) => {
    res.json(
      await modules.decideIncentive(req.user, req.params.id, req.body)
    );
  })
);

router.get('/rewards', wrap(async (req, res) => {
  res.json(await modules.listRewards(req.user));
}));

router.post(
  '/rewards',
  requirePermission(P.REWARDS_MANAGE),
  wrap(async (req, res) => {
    res.status(201).json(
      await modules.createReward(req.user, req.body)
    );
  })
);

router.get(
  '/penalties',
  requirePermission(P.PENALTIES_READ, P.PENALTIES_MANAGE),
  wrap(async (req, res) => {
    res.json(await modules.listPenalties(req.user));
  })
);

router.post(
  '/penalties',
  requirePermission(P.PENALTIES_MANAGE),
  wrap(async (req, res) => {
    res.status(201).json(
      await modules.createPenalty(req.user, req.body)
    );
  })
);

router.patch(
  '/penalties/:id/decision',
  requirePermission(P.PENALTIES_MANAGE),
  wrap(async (req, res) => {
    res.json(
      await modules.decidePenalty(req.user, req.params.id, req.body)
    );
  })
);

router.get('/performance/goals', wrap(async (req, res) => {
  res.json(
    await modules.listGoals(req.user, req.query.employeeId)
  );
}));

router.get('/performance/reviews', wrap(async (req, res) => {
  res.json(
    await modules.listReviews(req.user, req.query.employeeId)
  );
}));

router.post(
  '/performance/reviews',
  requirePermission(
    P.PERFORMANCE_TEAM,
    P.PERFORMANCE_PROCESS,
    P.PERFORMANCE_ALL
  ),
  wrap(async (req, res) => {
    res.status(201).json(
      await modules.upsertReview(req.user, req.body)
    );
  })
);

router.post(
  '/performance/goals',
  requirePermission(
    P.PERFORMANCE_TEAM,
    P.PERFORMANCE_PROCESS,
    P.PERFORMANCE_ALL
  ),
  wrap(async (req, res) => {
    res.status(201).json(await modules.createGoal(req.user, req.body));
  })
);

router.patch('/performance/goals/:id/progress', wrap(async (req, res) => {
  res.json(
    await modules.updateGoalProgress(req.user, req.params.id, req.body)
  );
}));

router.patch('/performance/reviews/:id/feedback', wrap(async (req, res) => {
  res.json(
    await modules.addReviewFeedback(req.user, req.params.id, req.body)
  );
}));

router.get('/assets', wrap(async (req, res) => {
  res.json(await modules.listAssets(req.user));
}));

router.post(
  '/assets',
  requirePermission(P.ASSETS_MANAGE),
  wrap(async (req, res) => {
    res.status(201).json(await modules.addAsset(req.user, req.body));
  })
);

router.patch(
  '/assets/:id/return',
  requirePermission(P.ASSETS_MANAGE),
  wrap(async (req, res) => {
    res.json(await modules.returnAsset(req.user, req.params.id));
  })
);

router.get('/assets/requests', wrap(async (req, res) => {
  res.json(await modules.listAssetRequests(req.user));
}));

router.post(
  '/assets/requests',
  requirePermission(P.ASSETS_REQUEST),
  wrap(async (req, res) => {
    res.status(201).json(
      await modules.requestAsset(req.user, req.body)
    );
  })
);

router.patch('/assets/requests/:id/decision', wrap(async (req, res) => {
  res.json(
    await modules.decideAssetRequest(req.user, req.params.id, req.body)
  );
}));

router.get('/grievances', wrap(async (req, res) => {
  res.json(await modules.listGrievances(req.user));
}));

router.post(
  '/grievances',
  requirePermission(P.GRIEVANCES_SELF),
  wrap(async (req, res) => {
    res.status(201).json(
      await modules.createGrievance(req.user, req.body)
    );
  })
);

router.post('/grievances/:id/comments', wrap(async (req, res) => {
  res.status(201).json(
    await modules.commentGrievance(req.user, req.params.id, req.body)
  );
}));

router.get('/reimbursements', wrap(async (req, res) => {
  res.json(await modules.listReimbursements(req.user));
}));

router.post(
  '/reimbursements',
  requirePermission(P.REIMBURSE_SELF),
  wrap(async (req, res) => {
    res.status(201).json(
      await modules.submitReimbursement(req.user, req.body)
    );
  })
);

router.patch('/reimbursements/:id/decision', wrap(async (req, res) => {
  res.json(
    await modules.decideReimbursement(req.user, req.params.id, req.body)
  );
}));

router.get('/learning', wrap(async (req, res) => {
  res.json(await modules.listLearning(req.user));
}));

router.get('/learning/courses', wrap(async (req, res) => {
  res.json(await modules.listCourses());
}));

router.post(
  '/learning/courses',
  requirePermission(P.LEARNING_ASSIGN),
  wrap(async (req, res) => {
    res.status(201).json(await modules.createCourse(req.user, req.body));
  })
);

router.post(
  '/learning/assign',
  requirePermission(P.LEARNING_ASSIGN),
  wrap(async (req, res) => {
    res.status(201).json(
      await modules.assignCourse(req.user, req.body)
    );
  })
);

router.post('/learning/:id/complete', wrap(async (req, res) => {
  res.json(
    await modules.completeCourse(req.user, req.params.id)
  );
}));

router.get('/notifications', wrap(async (req, res) => {
  res.json(await notifications.listNotifications(req.user.id));
}));

router.patch('/notifications/:id/read', wrap(async (req, res) => {
  res.json(
    await notifications.markRead(req.user.id, req.params.id)
  );
}));

router.get(
  '/search',
  requirePermission(P.SEARCH),
  wrap(async (req, res) => {
    res.json(await modules.searchAll(req.user, req.query.q));
  })
);

router.get('/reports/:type', wrap(async (req, res) => {
  const rows = await reports.runReport(
    req.user,
    req.params.type,
    req.query
  );

  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${req.params.type}.csv`
    );

    return res.send(reports.toCsv(rows));
  }

  res.json(rows);
}));

router.get('/lookups', wrap(async (_req, res) => {
  res.json(await modules.listLookups());
}));

router.patch(
  '/settings',
  requirePermission(P.SETTINGS_MANAGE),
  wrap(async (req, res) => {
    res.json(await modules.saveSettings(req.user, req.body));
  })
);

router.get(
  '/audit',
  requirePermission(P.AUDIT_READ),
  wrap(async (_req, res) => {
    res.json(await audit.listAudit());
  })
);

export default router;
