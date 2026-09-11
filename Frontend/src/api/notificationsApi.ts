import { axiosPrivate } from './axios';

export interface Notification {
  id: number;
  companyId: number;
  userId?: number;
  type: string;
  title: string;
  message: string;
  priority: string;
  resourceType?: string;
  resourceId?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface PaginatedNotifications {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
}

export const notificationsApi = {
  getNotifications: async (params?: { page?: number; limit?: number; isRead?: boolean; type?: string; priority?: string }): Promise<PaginatedNotifications> => {
    const response = await axiosPrivate.get('/notifications', { params });
    return response.data;
  },
  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await axiosPrivate.get('/notifications/unread-count');
    return response.data;
  },
  markAsRead: async (id: number): Promise<void> => {
    await axiosPrivate.patch(`/notifications/${id}/read`);
  },
  markAllAsRead: async (): Promise<void> => {
    await axiosPrivate.patch('/notifications/read-all');
  }
};
