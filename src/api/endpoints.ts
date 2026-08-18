import { api } from './client';
import type {
  AuthUser,
  ClubMessage,
  CoachStaff,
  LeaderboardCategory,
  LeaderboardResult,
  Member,
  MembershipPlan,
  TrainingComment,
  TrainingPlan,
  TrainingSession,
  TrainingTemplate,
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
  planType?: 'monthly' | 'credits';
  creditCount?: number | null;
  trainingsPerWeek?: number | null;
};
export const createMembershipPlanApi = (input: CreateMembershipPlanInput) =>
  api.post<MembershipPlan>('/membership-plans', input);
export const deleteMembershipPlanApi = (id: string) =>
  api.del<void>(`/membership-plans/${id}`);

export const deleteMemberApi = (id: string) =>
  api.del<void>(`/members/${id}`);

export const deleteCoachApi = (id: string) =>
  api.del<void>(`/coaches/${id}`);

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

// --- Member self-service billing ---
export type MyBillingInvoice = {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string;
  paidAt: string | null;
  createdDate: string;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  periodStart: string | null;
  periodEnd: string | null;
};
export type MyBillingResponse = {
  hasSubscription: boolean;
  status: 'paid' | 'overdue' | 'pending';
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  upcomingInvoice: {
    amount: number;
    currency: string;
    dueDate: string | null;
  } | null;
  invoices: MyBillingInvoice[];
  defaultPaymentMethod: { brand: string; last4: string } | null;
  member: Member;
};
export const fetchMyBillingApi = () => api.get<MyBillingResponse>('/me/billing');

export type CancelSubscriptionResponse = {
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  subscriptionStatus: string;
};
export const cancelMySubscriptionApi = () =>
  api.post<CancelSubscriptionResponse>('/me/subscription/cancel');
export const resumeMySubscriptionApi = () =>
  api.post<CancelSubscriptionResponse>('/me/subscription/resume');

export type PurchaseCreditsResponse = {
  clientSecret: string;
  stripeAccount: string;
  amount: number;
  creditCount: number;
};
export const purchaseCreditsApi = (membershipPlanId?: string) =>
  api.post<PurchaseCreditsResponse>(
    '/me/credits/purchase',
    membershipPlanId ? { membershipPlanId } : undefined,
  );

export type SubscribeResponse = {
  clientSecret: string;
  stripeAccount: string;
  amount: number;
  planName: string;
};
export const subscribeToPlanApi = (membershipPlanId: string) =>
  api.post<SubscribeResponse>('/me/subscribe', { membershipPlanId });

// --- Admin Stripe payments overview ---
export type ClubPaymentInvoice = {
  id: string;
  customerId: string | null;
  memberId: string | null;
  memberName: string | null;
  memberEmail: string | null;
  number: string | null;
  amount: number;
  currency: string;
  status: string;
  paidAt: string | null;
  createdDate: string;
  hostedInvoiceUrl: string | null;
  periodStart: string | null;
  periodEnd: string | null;
};
export type ClubPaymentsResponse = {
  connected: boolean;
  mtdRevenue: number;
  mtdCount: number;
  totalRevenue: number;
  currency: string;
  platformFeePct: number;
  invoices: ClubPaymentInvoice[];
};
export const fetchClubPaymentsApi = () =>
  api.get<ClubPaymentsResponse>('/connect/payments');

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

// --- Club chat ---
export const fetchChatMessages = () => api.get<ClubMessage[]>('/chat');
export const sendChatMessage = (body: string) => api.post<ClubMessage>('/chat', { body });
export const deleteChatMessage = (id: string) => api.del<void>(`/chat/${id}`);

// --- Training comments ---
export const fetchTrainingComments = (trainingId: string) =>
  api.get<TrainingComment[]>(`/trainings/${trainingId}/comments`);
export const createTrainingCommentApi = (trainingId: string, body: string) =>
  api.post<TrainingComment>(`/trainings/${trainingId}/comments`, { body });
export const deleteTrainingCommentApi = (trainingId: string, commentId: string) =>
  api.del<void>(`/trainings/${trainingId}/comments/${commentId}`);

// --- Training plans ---
export const upsertPlanApi = (plan: TrainingPlan) =>
  api.put<TrainingPlan>('/training-plans', plan);
export const publishPlanApi = (id: string) =>
  api.patch<TrainingPlan>(`/training-plans/${id}/publish`);
export const deletePlanApi = (id: string) => api.del<void>(`/training-plans/${id}`);

// --- Training templates (reusable pre-filled trainings) ---
export type TrainingTemplateInput = Omit<TrainingTemplate, 'id' | 'updatedAt'>;
export const fetchTrainingTemplates = () =>
  api.get<TrainingTemplate[]>('/training-templates');
export const createTrainingTemplateApi = (input: TrainingTemplateInput) =>
  api.post<TrainingTemplate>('/training-templates', input);
export const patchTrainingTemplateApi = (
  id: string,
  patch: Partial<TrainingTemplateInput>,
) => api.patch<TrainingTemplate>(`/training-templates/${id}`, patch);
export const deleteTrainingTemplateApi = (id: string) =>
  api.del<void>(`/training-templates/${id}`);

export type GeneratedTemplate = Omit<TrainingTemplate, 'id' | 'updatedAt'>;
export const generateTrainingTemplateApi = (prompt: string) =>
  api.post<GeneratedTemplate>('/training-templates/generate', { prompt });

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
