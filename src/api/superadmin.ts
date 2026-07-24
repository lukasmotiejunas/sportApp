import { api } from './client';
import type { Club, ClubDetail, ClubSummary, SuperAdminStats } from '../types';

export const fetchSuperAdminStats = () =>
  api.get<SuperAdminStats>('/superadmin/stats');

export const fetchSuperAdminClubs = () =>
  api.get<ClubSummary[]>('/superadmin/clubs');

export const fetchSuperAdminClub = (id: string) =>
  api.get<ClubDetail>(`/superadmin/clubs/${id}`);

export type CreateClubInput = {
  name: string;
  slug?: string;
  adminEmail: string;
  adminPassword: string;
  adminName?: string;
};

export const createClubApi = (input: CreateClubInput) =>
  api.post<Club & { admin: { id: string; email: string } | null }>(
    '/superadmin/clubs',
    input,
  );

export const deleteClubApi = (id: string) =>
  api.del<void>(`/superadmin/clubs/${id}`);
