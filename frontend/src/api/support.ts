import { apiClient } from './client';
import { SupportMessage, SupportMessageCreate } from '../types';

export const supportApi = {
  getMessages: (userId: number, params?: { limit?: number; offset?: number }) =>
    apiClient.get<SupportMessage[]>(`/support/${userId}/messages`, { params }),

  sendMessage: (userId: number, data: SupportMessageCreate) =>
    apiClient.post<SupportMessage>(`/support/${userId}/messages`, data),

  getUnreadCount: (userId: number) =>
    apiClient.get<{ unread_count: number }>(`/support/${userId}/unread`),

  markAsRead: (userId: number) =>
    apiClient.post(`/support/${userId}/read`),
};