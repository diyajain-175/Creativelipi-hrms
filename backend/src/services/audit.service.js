import { auditRepo } from '../repositories/index.js';
import { nextId, nowIso } from '../utils/ids.js';

export function writeAudit({ userId, action, module, recordId, meta }) {
  return auditRepo.insert({
    id: nextId('AUD', auditRepo.all()),
    userId: userId || null,
    action,
    module,
    recordId: recordId || null,
    meta: meta || {},
    createdAt: nowIso(),
  });
}

export function listAudit(limit = 100) {
  return [...auditRepo.all()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}
