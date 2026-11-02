
import { postgresNotificationRepo } from '../repositories/postgres/notification.repository.js';
import { postgresUserRepo } from '../repositories/postgres/user.repository.js';

export async function notifyEmployee(employeeId, { title, body, module }) {
  const user = await postgresUserRepo.findByEmployeeId(employeeId);

  if (!user) return null;

  return postgresNotificationRepo.insert({
    id: await postgresNotificationRepo.nextId(),
    userId: user.id,
    title,
    body,
    module,
    isRead: false,
  });
}

export async function listNotifications(userId) {
  const notifications = await postgresNotificationRepo.find(
    (item) => item.userId === userId
  );

  return notifications.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );
}

export async function markRead(userId, id) {
  const notification = await postgresNotificationRepo.findById(id);

  if (!notification || notification.userId !== userId) {
    return null;
  }

  return postgresNotificationRepo.update(id, { isRead: true });
}
