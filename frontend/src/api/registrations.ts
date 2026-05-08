import { apiClient } from './client';
import { Registration, RegistrationRequest } from '../types';

export const registrationsApi = {
  register: (data: RegistrationRequest) =>
    apiClient.post<Registration>(`/tournaments/${data.tournament_id}/register`, data),

  getByTournament: (tournamentId: number, params?: { status?: string }) =>
    apiClient.get<Registration[]>(`/tournaments/${tournamentId}/registrations`, { params }),

  approve: (id: number) =>
    apiClient.post(`/registrations/${id}/approve`),

  reject: (id: number) =>
    apiClient.post(`/registrations/${id}/reject`),
};