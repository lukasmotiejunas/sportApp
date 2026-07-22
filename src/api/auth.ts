import { api } from './client';
import type { AuthUser } from '../types';

export const loginApi = (email: string, password: string) =>
  api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });

export const fetchMe = () => api.get<AuthUser>('/auth/me');
