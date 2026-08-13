import { api } from './client';
import type {
  Club,
  ClubDetail,
  ClubFinances,
  ClubSummary,
  PlatformFinances,
  SuperAdminStats,
} from '../types';

export const fetchSuperAdminStats = () =>
  api.get<SuperAdminStats>('/superadmin/stats');

export const fetchSuperAdminClubs = () =>
  api.get<ClubSummary[]>('/superadmin/clubs');

export const fetchSuperAdminClub = (id: string) =>
  api.get<ClubDetail>(`/superadmin/clubs/${id}`);

// month = "YYYY-MM" for a single-month view, or null/undefined for all-time.
export const fetchSuperAdminClubFinances = (id: string, month?: string | null) => {
  const q = month ? `?month=${encodeURIComponent(month)}` : '';
  return api.get<ClubFinances>(`/superadmin/clubs/${id}/finances${q}`);
};

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

// Returns a JWT + user for the impersonation target. Server refuses to
// impersonate another super_admin.
export const impersonateUserApi = (userId: string) =>
  api.post<{ token: string }>(`/superadmin/impersonate/${userId}`);

export const fetchSuperAdminFinances = () =>
  api.get<PlatformFinances>('/superadmin/finances');

export type MeetingRecord = {
  id: string;
  date: string;
  startTime: string;
  bookedByName: string;
  bookedByEmail: string;
  inviteEmails: string[];
  createdAt: string;
};

export const fetchSuperAdminMeetings = () =>
  api.get<MeetingRecord[]>('/superadmin/meetings');

export const deleteMeeting = (id: string) =>
  api.del<void>(`/superadmin/meetings/${id}`);
