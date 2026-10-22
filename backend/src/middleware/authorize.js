import { hasPermission } from '../config/permissions.js';
import { forbidden } from '../utils/errors.js';

export function requirePermission(...permissions) {
  return (req, _res, next) => {
    const ok = permissions.some((p) => hasPermission(req.user.role, p));
    if (!ok) return next(forbidden());
    next();
  };
}
