import { api } from './client';
import type { Member, MembershipPlan } from '../types';

export type PublicClub = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  plans: MembershipPlan[];
};

export const fetchPublicClub = (slug: string) =>
  api.get<PublicClub>(`/public/clubs/${encodeURIComponent(slug)}`);

export type JoinInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'unspecified';
  membershipPlanId?: string;
  bankAccountHolder?: string;
  bankAccountIban?: string;
};

export type JoinResult = {
  member: Member;
  club: { id: string; name: string; slug: string };
  loginUrl: string;
};

export const joinClubApi = (slug: string, input: JoinInput) =>
  api.post<JoinResult>(`/public/clubs/${encodeURIComponent(slug)}/members`, input);
