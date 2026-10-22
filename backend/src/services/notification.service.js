import { notificationRepo, userRepo } from '../repositories/index.js';
import { nextId, nowIso } from '../utils/ids.js';

export function notifyEmployee(employeeId, { title, body, module }) {
  const user = userRepo.findByEmployeeId(employeeId);
  if (!user) return null;
  return notificationRepo.insert({
    id: nextId('NTF', notificationRepo.all()),
    userId: user.id,
    title,
    body,
    module,
    isRead: false,
    createdAt: nowIso(),
  });
}

export function listNotifications(userId) {
  return notificationRepo
    .find((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function markRead(userId, id) {
  const row = notificationRepo.findById(id);
  if (!row || row.userId !== userId) return null;
  return notificationRepo.update(id, { isRead: true });
}
