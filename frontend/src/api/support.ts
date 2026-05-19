import { apiClient } from './client';
import { SupportMessage, SupportMessageCreate, ActiveChat } from '../types';

export const supportApi = {
  getMessages: (userId: number, params?: { limit?: number; offset?: number }) =>
    apiClient.get<SupportMessage[]>(`/support/${userId}/messages`, { params }),

 sendMessage: (userId: number, data: SupportMessageCreate) =>
  apiClient.post<SupportMessage>(`/support/${userId}/messages`, data),
 
  getUnreadCount: (userId: number) =>
    apiClient.get<{ unread_count: number }>(`/support/${userId}/unread`),

  markAsRead: (userId: number) =>
    apiClient.post(`/support/${userId}/read`),

  getActiveChats: () =>
    apiClient.get<ActiveChat[]>('/support/chats'),

  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return apiClient.post<{ url: string }>('/support/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};