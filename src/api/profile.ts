import { api } from './client';
import type { AuthUser, CoachStaff } from '../types';

export const ensureAdminCoachApi = () => api.post<CoachStaff>('/profile/ensure-coach');

export type UpdateSelfInput = {
  name?: string;
  email?: string;
};

export const updateSelfApi = (input: UpdateSelfInput) =>
  api.put<AuthUser>('/profile', input);

export const changePasswordApi = (input: {
  currentPassword: string;
  newPassword: string;
}) => api.post<void>('/profile/password', input);

export type UpdateClubInput = {
  name?: string;
  // Data URL to set, empty string / null to clear the logo.
  logoUrl?: string | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
};

export type UpdateClubResult = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
};

export const updateClubApi = (input: UpdateClubInput) =>
  api.put<UpdateClubResult>('/profile/club', input);

export type UpdateCoachSelfInput = {
  name?: string;
  specialty?: string;
  phone?: string;
  // Data URL to set, empty string to clear the photo.
  photoUrl?: string | null;
};

export const updateCoachSelfApi = (input: UpdateCoachSelfInput) =>
  api.put<CoachStaff>('/profile/coach', input);

export type NotificationSettings = {
  notifyNewMember: boolean;
  notifyNewTraining: boolean;
  notifyPayment: boolean;
};

export const getNotificationSettingsApi = () =>
  api.get<NotificationSettings>('/profile/notifications');

export const updateNotificationSettingsApi = (input: Partial<NotificationSettings>) =>
  api.patch<NotificationSettings>('/profile/notifications', input);
