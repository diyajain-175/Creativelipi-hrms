
import { postgresAuditRepo } from '../repositories/postgres/audit.repository.js';

export async function writeAudit({
  userId,
  action,
  module,
  recordId,
  meta,
}) {
  const id = await postgresAuditRepo.nextId();

  return postgresAuditRepo.insert({
    id,
    userId: userId || null,
    action,
    module,
    recordId: recordId || null,
    meta: meta || {},
  });
}

export async function listAudit(limit = 100) {
  const logs = await postgresAuditRepo.all();

  return logs
    .sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt))
    )
    .slice(0, limit);
}
