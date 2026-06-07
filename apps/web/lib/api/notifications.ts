'use client';

import { apiGet, apiPatch } from './client';
import { getApiBaseUrl } from './config';
import type { BackendNotification, NotificationListResponse } from './types';

export type { BackendNotification, NotificationListResponse };

export function listNotifications(unreadOnly?: boolean, page = 1, perPage = 15) {
  const baseUrl = getApiBaseUrl('resident');
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('per_page', String(perPage));
  if (unreadOnly) params.set('unread', 'true');
  return apiGet<NotificationListResponse>(baseUrl, `/api/notifications?${params.toString()}`);
}

export function markNotificationRead(id: number) {
  const baseUrl = getApiBaseUrl('resident');
  return apiPatch<{ notification: BackendNotification }>(
    baseUrl,
    `/api/notifications/${id}/read`,
    {}
  );
}

export function markAllNotificationsRead() {
  const baseUrl = getApiBaseUrl('resident');
  return apiPatch<void>(baseUrl, '/api/notifications/read-all', {});
}
