import { api } from './client';
import type {
  AuthUser,
  CoachStaff,
  LeaderboardCategory,
  LeaderboardResult,
  Member,
  MembershipPlan,
  TrainingPlan,
  TrainingSession,
} from '../types';

// --- Reads (used by loadInitialData) ---
export const fetchMembers = () => api.get<Member[]>('/members');
export const fetchCoaches = () => api.get<CoachStaff[]>('/coaches');
export const fetchMembershipPlans = () => api.get<MembershipPlan[]>('/membership-plans');
export const fetchTrainings = () => api.get<TrainingSession[]>('/trainings');
export const fetchTrainingPlans = () => api.get<TrainingPlan[]>('/training-plans');
export const fetchLeaderboardCategories = () =>
  api.get<LeaderboardCategory[]>('/leaderboards/categories');
export const fetchLeaderboardResults = () =>
  api.get<LeaderboardResult[]>('/leaderboards/results');

// --- Admin ---
export const fetchUsers = () => api.get<AuthUser[]>('/users');

export type CreateMembershipPlanInput = {
  name: string;
  monthlyFee: number;
  currency?: string;
  trainingsPerWeek?: number | null;
};
export const createMembershipPlanApi = (input: CreateMembershipPlanInput) =>
  api.post<MembershipPlan>('/membership-plans', input);
export const deleteMembershipPlanApi = (id: string) =>
  api.del<void>(`/membership-plans/${id}`);

export type CreateCoachInput = {
  name: string;
  email: string;
  password: string;
  specialty?: string;
};
export const createCoachApi = (input: CreateCoachInput) =>
  api.post<CoachStaff>('/coaches', input);

export type CreateMemberInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Member['gender'];
  ageGroup?: string;
  membershipPlanId?: string;
};
export const createMemberApi = (input: CreateMemberInput) =>
  api.post<Member>('/members', input);

// --- Members ---
export const patchMember = (id: string, patch: Partial<Member>) =>
  api.patch<Member>(`/members/${id}`, patch);

// --- Trainings ---
export const createTrainingApi = (training: Partial<TrainingSession> & { id: string }) =>
  api.post<TrainingSession>('/trainings', training);
export const patchTraining = (id: string, patch: Partial<TrainingSession>) =>
  api.patch<TrainingSession>(`/trainings/${id}`, patch);
export const deleteTrainingApi = (id: string) => api.del<void>(`/trainings/${id}`);
export const registerForTrainingApi = (trainingId: string, memberId: string) =>
  api.post<TrainingSession>(`/trainings/${trainingId}/registrations`, { memberId });
export const cancelRegistrationApi = (trainingId: string, memberId: string) =>
  api.del<TrainingSession>(`/trainings/${trainingId}/registrations/${memberId}`);

// --- Training plans ---
export const upsertPlanApi = (plan: TrainingPlan) =>
  api.put<TrainingPlan>('/training-plans', plan);
export const publishPlanApi = (id: string) =>
  api.patch<TrainingPlan>(`/training-plans/${id}/publish`);
export const deletePlanApi = (id: string) => api.del<void>(`/training-plans/${id}`);

// --- Leaderboards ---
export const createCategoryApi = (category: LeaderboardCategory) =>
  api.post<LeaderboardCategory>('/leaderboards/categories', category);
export const patchCategoryApi = (id: string, patch: Partial<LeaderboardCategory>) =>
  api.patch<LeaderboardCategory>(`/leaderboards/categories/${id}`, patch);
export const createResultApi = (result: LeaderboardResult) =>
  api.post<LeaderboardResult>('/leaderboards/results', result);
export const patchResultApi = (id: string, patch: Partial<LeaderboardResult>) =>
  api.patch<LeaderboardResult>(`/leaderboards/results/${id}`, patch);
export const deleteResultApi = (id: string) => api.del<void>(`/leaderboards/results/${id}`);
