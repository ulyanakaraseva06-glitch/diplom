import { apiClient } from './client';
import { User } from '../types';

export const usersApi = {
  getAll: (params?: { limit?: number; offset?: number }) =>
    apiClient.get<User[]>('/admin/users', { params }),
  
  getById: (id: number) =>
    apiClient.get<User>(`/admin/users/${id}`),
};