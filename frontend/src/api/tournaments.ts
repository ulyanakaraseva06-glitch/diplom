import { apiClient } from './client';
import { Tournament, TournamentCreate, TournamentUpdate, TournamentWithParticipants } from '../types';

export const tournamentsApi = {
  getAll: (params?: { game?: string; status?: string }) =>
    apiClient.get<Tournament[]>('/tournaments', { params }),

  getById: (id: number) =>
    apiClient.get<Tournament>(`/tournaments/${id}`),

  create: (data: TournamentCreate) =>
    apiClient.post<Tournament>('/tournaments', data),

  update: (id: number, data: TournamentUpdate) =>
    apiClient.put<Tournament>(`/admin/tournaments/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/admin/tournaments/${id}`),

  approve: (id: number) =>
    apiClient.post(`/admin/tournaments/${id}/approve`),

  getDetailsWithParticipants: (id: number) =>
    apiClient.get<TournamentWithParticipants>(`/tournaments/${id}/details`),
  saveBracket: (id: number, data: { matches: any[]; championId: number | null }) =>
  apiClient.post(`/tournaments/${id}/bracket`, data),

  getBracket: (id: number) =>
  apiClient.get<{ matches: any[]; championId: number | null }>(`/tournaments/${id}/bracket`),
};