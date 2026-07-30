import { api } from './client';
import type { AuthUser, CoachStaff } from '../types';

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
};

export const updateClubApi = (input: UpdateClubInput) =>
  api.put<{ id: string; name: string; slug: string; logoUrl: string | null }>(
    '/profile/club',
    input,
  );

export type UpdateCoachSelfInput = {
  name?: string;
  specialty?: string;
  phone?: string;
  // Data URL to set, empty string to clear the photo.
  photoUrl?: string | null;
};

export const updateCoachSelfApi = (input: UpdateCoachSelfInput) =>
  api.put<CoachStaff>('/profile/coach', input);
