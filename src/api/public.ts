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

export type PublicClubListItem = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  city: string | null;
};

export const fetchPublicClubs = () =>
  api.get<PublicClubListItem[]>('/public/clubs');

export type JoinInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'unspecified';
  membershipPlanId?: string;
};

export type JoinResult = {
  member: Member;
  club: {
    id: string;
    name: string;
    slug: string;
    stripeConnectAccountId: string | null;
  };
  // True when a Stripe subscription was created and the client must confirm
  // payment via Stripe Elements. False when the club isn't Connect-ready.
  paymentRequired: boolean;
  clientSecret: string | null;
  loginUrl: string;
};

export const joinClubApi = (slug: string, input: JoinInput) =>
  api.post<JoinResult>(`/public/clubs/${encodeURIComponent(slug)}/members`, input);

export type MeetingSlotsResult = {
  validSlots: string[];
  bookedSlots: string[];
};

export const fetchMeetingSlots = (date: string) =>
  api.get<MeetingSlotsResult>(`/public/meetings/slots?date=${encodeURIComponent(date)}`);

export type BookMeetingInput = {
  date: string;
  startTime: string;
  name: string;
  email: string;
  inviteEmails: string[];
};

export const bookMeeting = (input: BookMeetingInput) =>
  api.post<{ ok: boolean }>('/public/meetings', input);
