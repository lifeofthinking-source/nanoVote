import { Notification } from '../types';
import { mockDb, simulateDelay } from '../mock/mockDatabase';

export const notificationService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    await simulateDelay(80, 180);
    return mockDb.getNotifications(userId);
  },

  async markAsRead(id: string): Promise<void> {
    mockDb.markNotificationAsRead(id);
  },

  async markAllAsRead(userId: string): Promise<void> {
    mockDb.markAllNotificationsAsRead(userId);
  }
};
