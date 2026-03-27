import { apiJson } from './api-client';

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  meta?: Record<string, any>;
};

export type PaginatedNotifications = {
  notifications: AppNotification[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export async function listMyNotifications(params: { page?: number; limit?: number; unreadOnly?: boolean } = {}): Promise<PaginatedNotifications> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set('page', String(params.page));
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.unreadOnly != null) qs.set('unreadOnly', String(params.unreadOnly));
  return await apiJson<PaginatedNotifications>(
    `/notifications/my${qs.toString() ? `?${qs}` : ''}`,
    { method: 'GET' }
  );
}

export async function getMyUnreadCount(): Promise<{ unread: number }> {
  return await apiJson<{ unread: number }>(`/notifications/my/unread-count`, { method: 'GET' });
}

export async function markNotificationRead(id: string): Promise<{ id: string; read: boolean; readAt?: string }> {
  return await apiJson<{ id: string; read: boolean; readAt?: string }>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  return await apiJson<{ updated: number }>(`/notifications/my/read-all`, { method: 'PATCH' });
}

