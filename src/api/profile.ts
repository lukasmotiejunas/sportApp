import { api } from './client';
import type { AuthUser } from '../types';

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

export const updateClubApi = (input: { name: string }) =>
  api.put<{ id: string; name: string; slug: string }>('/profile/club', input);
