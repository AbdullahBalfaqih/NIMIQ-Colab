import prisma from '../../database/prisma';

export interface NotificationPayload {
  type: string;
  groupId?: string;
  recipientUserId: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

/**
 * Notification Service — abstraction layer.
 * Currently writes to DB (in-app notifications).
 * Extensible: add email, push, SMS adapters without changing callers.
 */
export class NotificationService {
  async emit(payload: NotificationPayload): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          userId: payload.recipientUserId,
          groupId: payload.groupId,
          eventType: payload.type as any,
          title: payload.title,
          body: payload.body,
          metadata: payload.metadata as any,
        },
      });

      // Future hooks:
      // await this.emailAdapter?.send(payload);
      // await this.pushAdapter?.send(payload);
    } catch (err) {
      // Notifications must never crash the main flow
      console.error('[NOTIFICATION] Failed to emit notification:', err);
    }
  }

  async getUserNotifications(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);
    return { notifications, total, page, limit };
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true, readAt: new Date() },
    });
  }
}
