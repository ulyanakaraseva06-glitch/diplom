import { apiClient } from './client';
import { Ban, BanRequest } from '../types';

export const bansApi = {
  getAll: (params?: { limit?: number; offset?: number }) =>
    apiClient.get<Ban[]>('/admin/bans', { params }),

  getByUser: (userId: number) =>
    apiClient.get<Ban>(`/admin/bans/${userId}`),

  create: (data: BanRequest) =>
    apiClient.post<Ban>('/admin/bans', data),

  remove: (userId: number) =>
    apiClient.delete(`/admin/bans/${userId}`),
};