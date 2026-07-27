import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// Payments are intentionally kept client-side (feature skipped for the backend
// for now). Everything else is loaded from and persisted to the API.
import { payments as mockPayments } from '../data/mockData';
import {
  ApiError,
  setAuthToken,
  setOnUnauthorized,
  setOnSubscriptionSuspended,
} from '../api/client';
import * as apiEndpoints from '../api/endpoints';
import { loginApi, fetchMe } from '../api/auth';
import type {
  AuthUser,
  CoachStaff,
  LeaderboardCategory,
  LeaderboardResult,
  Member,
  MembershipPlan,
  Payment,
  PaymentStatus,
  Role,
  SubscriptionStatus,
  ToastRecord,
  TrainingPlan,
  TrainingSession,
} from '../types';
import { todayIso } from '../utils/dates';

type ToastInput = Omit<ToastRecord, 'id'>;

const genId = (prefix: string) => prefix + Math.random().toString(36).slice(2, 10);

type State = {
  // Auth
  token: string | null;
  authUser: AuthUser | null;
  authChecked: boolean;
  role: Role | null;
  currentMemberId: string;
  currentCoachId: string;

  // Platform subscription status of the current user's club. `null` for
  // super_admin, unknown-legacy clubs, and unauthenticated states.
  subscriptionStatus: SubscriptionStatus | null;
  markSubscriptionSuspended: () => void;
  setSubscriptionStatus: (status: SubscriptionStatus | null) => void;

  loaded: boolean;

  members: Member[];
  membershipPlans: MembershipPlan[];
  coaches: CoachStaff[];
  trainingSessions: TrainingSession[];
  trainingPlans: TrainingPlan[];
  leaderboardCategories: LeaderboardCategory[];
  leaderboardResults: LeaderboardResult[];
  payments: Payment[];

  toasts: ToastRecord[];
  pushToast: (t: ToastInput) => void;
  dismissToast: (id: string) => void;

  loadInitialData: (roleOverride?: Role) => Promise<void>;

  // Auth actions
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  patchAuthUser: (patch: Partial<AuthUser>) => void;

  // Member actions
  registerForTraining: (trainingId: string, memberId: string) => { ok: boolean; error?: string };
  cancelRegistration: (trainingId: string, memberId: string) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
  simulatePayment: (memberId: string) => void;

  // Coach actions
  createTraining: (t: Omit<TrainingSession, 'id' | 'registrations' | 'status'>) => TrainingSession;
  updateTraining: (id: string, patch: Partial<TrainingSession>) => void;
  duplicateTraining: (id: string) => void;
  deleteTraining: (id: string) => void;
  setTrainingStatus: (id: string, status: TrainingSession['status']) => void;

  upsertPlan: (plan: TrainingPlan) => void;
  publishPlan: (planId: string) => void;
  deletePlan: (planId: string) => void;

  addLeaderboardCategory: (c: Omit<LeaderboardCategory, 'id'>) => LeaderboardCategory;
  updateLeaderboardCategory: (id: string, patch: Partial<LeaderboardCategory>) => void;
  archiveLeaderboardCategory: (id: string) => void;

  addLeaderboardResult: (r: Omit<LeaderboardResult, 'id'>) => LeaderboardResult;
  updateLeaderboardResult: (id: string, patch: Partial<LeaderboardResult>) => void;
  removeLeaderboardResult: (id: string) => void;

  setPaymentStatus: (memberId: string, status: PaymentStatus) => void;
  addCoachNote: (memberId: string, note: string) => void;

  // Membership plan actions (admin)
  addMembershipPlan: (input: {
    name: string;
    monthlyFee: number;
    currency?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  removeMembershipPlan: (id: string) => void;
};

let toastCounter = 0;

export const useStore = create<State>()(
  persist(
    (set, get) => {
      // Shared helper: report a failed background sync and re-fetch from the
      // server so the UI reconciles with the source of truth.
      const onSyncError = (fallback: string) => (err: unknown) => {
        const message = err instanceof ApiError ? err.message : fallback;
        get().pushToast({ kind: 'error', message });
        void get().loadInitialData();
      };

      return {
        token: null,
        authUser: null,
        authChecked: false,
        role: null,
        currentMemberId: '',
        currentCoachId: '',
        subscriptionStatus: null,

        markSubscriptionSuspended: () => {
          const current = get().subscriptionStatus;
          // Preserve which specific bad state we're in if we already know it.
          if (current === 'past_due' || current === 'cancelled') return;
          set({ subscriptionStatus: 'past_due' });
        },
        setSubscriptionStatus: (status) => set({ subscriptionStatus: status }),

        loaded: false,

        members: [],
        membershipPlans: [],
        coaches: [],
        trainingSessions: [],
        trainingPlans: [],
        leaderboardCategories: [],
        leaderboardResults: [],
        payments: mockPayments,

        toasts: [],
        pushToast: (t) => {
          toastCounter += 1;
          const id = `toast-${Date.now()}-${toastCounter}`;
          set({ toasts: [...get().toasts, { ...t, id }] });
          setTimeout(() => {
            set({ toasts: get().toasts.filter((x) => x.id !== id) });
          }, 3800);
        },
        dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

        loadInitialData: async (roleOverride) => {
          // Super-admin has no club context; every tenant-scoped endpoint
          // requires a clubId. The super-admin dashboard fetches its own data.
          const role = roleOverride ?? get().authUser?.role;
          if (role === 'super_admin') {
            set({ loaded: true });
            return;
          }
          try {
            const [
              members,
              coaches,
              membershipPlans,
              trainingSessions,
              trainingPlans,
              leaderboardCategories,
              leaderboardResults,
            ] = await Promise.all([
              apiEndpoints.fetchMembers(),
              apiEndpoints.fetchCoaches(),
              apiEndpoints.fetchMembershipPlans(),
              apiEndpoints.fetchTrainings(),
              apiEndpoints.fetchTrainingPlans(),
              apiEndpoints.fetchLeaderboardCategories(),
              apiEndpoints.fetchLeaderboardResults(),
            ]);
            set({
              members,
              coaches,
              membershipPlans,
              trainingSessions,
              trainingPlans,
              leaderboardCategories,
              leaderboardResults,
              loaded: true,
            });
          } catch (err) {
            const message =
              err instanceof ApiError
                ? err.message
                : 'Nepavyko prisijungti prie serverio. Ar paleistas backend?';
            get().pushToast({ kind: 'error', message });
          }
        },

        bootstrap: async () => {
          // Force logout if any request returns 401 (expired/invalid token).
          setOnUnauthorized(() => get().logout());
          // Flip into suspension mode on any 403 subscription_suspended.
          setOnSubscriptionSuspended(() => get().markSubscriptionSuspended());

          const token = get().token;
          if (!token) {
            set({ authChecked: true });
            return;
          }
          setAuthToken(token);
          try {
            const user = await fetchMe();
            set({
              authUser: user,
              role: user.role,
              currentMemberId: user.memberId ?? '',
              currentCoachId: user.coachId ?? '',
              subscriptionStatus: user.subscription?.status ?? null,
            });
            // Skip loading domain data when suspended — those endpoints will
            // 403 anyway. Admin can navigate straight to /admin/subscription.
            const suspended =
              user.subscription?.status === 'past_due' ||
              user.subscription?.status === 'cancelled';
            if (!suspended) {
              await get().loadInitialData(user.role);
            } else {
              set({ loaded: true });
            }
          } catch {
            // Token invalid/expired -> clear it and show the login screen.
            setAuthToken(null);
            set({ token: null, authUser: null, role: null });
          } finally {
            set({ authChecked: true });
          }
        },

        login: async (email, password) => {
          try {
            const { token, user } = await loginApi(email, password);
            setAuthToken(token);
            // Load domain data BEFORE exposing `authUser`. App.tsx redirects
            // away from /login the instant `authUser` is set, so if we set it
            // first the target page could mount before its data is loaded and
            // crash (e.g. CoachDashboard reading an undefined coach).
            set({ token });
            const suspended =
              user.subscription?.status === 'past_due' ||
              user.subscription?.status === 'cancelled';
            if (!suspended) {
              await get().loadInitialData(user.role);
            } else {
              set({ loaded: true });
            }
            set({
              authUser: user,
              role: user.role,
              currentMemberId: user.memberId ?? '',
              currentCoachId: user.coachId ?? '',
              subscriptionStatus: user.subscription?.status ?? null,
            });
            return { ok: true };
          } catch (err) {
            const message =
              err instanceof ApiError ? err.message : 'Nepavyko prisijungti.';
            return { ok: false, error: message };
          }
        },

        patchAuthUser: (patch) => {
          const current = get().authUser;
          if (!current) return;
          set({ authUser: { ...current, ...patch } });
        },

        logout: () => {
          setAuthToken(null);
          set({
            token: null,
            authUser: null,
            role: null,
            currentMemberId: '',
            currentCoachId: '',
            subscriptionStatus: null,
            loaded: false,
            members: [],
            coaches: [],
            trainingSessions: [],
            trainingPlans: [],
            leaderboardCategories: [],
            leaderboardResults: [],
          });
        },

        registerForTraining: (trainingId, memberId) => {
          const state = get();
          const t = state.trainingSessions.find((x) => x.id === trainingId);
          const m = state.members.find((x) => x.id === memberId);
          if (!t || !m) return { ok: false, error: 'Nerasta' };
          if (t.status !== 'open') return { ok: false, error: 'Registracija į šią treniruotę uždaryta.' };
          if (m.paymentStatus === 'overdue') {
            return { ok: false, error: 'Narystės mokėjimas vėluoja.' };
          }
          if (t.registrations.some((r) => r.memberId === memberId)) {
            return { ok: false, error: 'Jau užsiregistravote.' };
          }
          if (t.registrations.length >= t.capacity) {
            return { ok: false, error: 'Ši treniruotė užpildyta.' };
          }
          // Optimistic update, then persist to the server (which re-validates).
          set({
            trainingSessions: state.trainingSessions.map((x) =>
              x.id === trainingId
                ? {
                    ...x,
                    registrations: [
                      ...x.registrations,
                      { memberId, registeredAt: new Date().toISOString() },
                    ],
                  }
                : x,
            ),
          });
          apiEndpoints
            .registerForTrainingApi(trainingId, memberId)
            .then((updated) => {
              set({
                trainingSessions: get().trainingSessions.map((x) =>
                  x.id === trainingId ? updated : x,
                ),
              });
            })
            .catch(onSyncError('Nepavyko užsiregistruoti.'));
          return { ok: true };
        },

        cancelRegistration: (trainingId, memberId) => {
          set({
            trainingSessions: get().trainingSessions.map((t) =>
              t.id === trainingId
                ? { ...t, registrations: t.registrations.filter((r) => r.memberId !== memberId) }
                : t,
            ),
          });
          apiEndpoints
            .cancelRegistrationApi(trainingId, memberId)
            .catch(onSyncError('Nepavyko atšaukti registracijos.'));
        },

        updateMember: (id, patch) => {
          set({
            members: get().members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
          });
          apiEndpoints.patchMember(id, patch).catch(onSyncError('Nepavyko atnaujinti nario.'));
        },

        simulatePayment: (memberId) => {
          // Payments are client-side only for now (backend feature skipped).
          const iso = todayIso();
          set({
            members: get().members.map((m) =>
              m.id === memberId ? { ...m, paymentStatus: 'paid', lastPaymentDate: iso } : m,
            ),
            payments: get().payments.map((p) =>
              p.memberId === memberId
                ? { ...p, status: 'paid', paidDate: iso, method: p.method ?? 'Visa · 4242' }
                : p,
            ),
          });
        },

        createTraining: (t) => {
          const newT: TrainingSession = {
            ...t,
            id: genId('t-'),
            registrations: [],
            status: 'open',
          };
          set({ trainingSessions: [newT, ...get().trainingSessions] });
          apiEndpoints
            .createTrainingApi(newT)
            .then((created) => {
              set({
                trainingSessions: get().trainingSessions.map((x) =>
                  x.id === newT.id ? created : x,
                ),
              });
            })
            .catch(onSyncError('Nepavyko sukurti treniruotės.'));
          return newT;
        },

        updateTraining: (id, patch) => {
          set({
            trainingSessions: get().trainingSessions.map((t) =>
              t.id === id ? { ...t, ...patch } : t,
            ),
          });
          apiEndpoints
            .patchTraining(id, patch)
            .catch(onSyncError('Nepavyko atnaujinti treniruotės.'));
        },

        duplicateTraining: (id) => {
          const src = get().trainingSessions.find((t) => t.id === id);
          if (!src) return;
          const copy: TrainingSession = {
            ...src,
            id: genId('t-'),
            title: src.title + ' (kopija)',
            registrations: [],
            status: 'open',
          };
          set({ trainingSessions: [copy, ...get().trainingSessions] });
          apiEndpoints
            .createTrainingApi(copy)
            .then((created) => {
              set({
                trainingSessions: get().trainingSessions.map((x) =>
                  x.id === copy.id ? created : x,
                ),
              });
            })
            .catch(onSyncError('Nepavyko dublikuoti treniruotės.'));
        },

        deleteTraining: (id) => {
          set({ trainingSessions: get().trainingSessions.filter((t) => t.id !== id) });
          apiEndpoints
            .deleteTrainingApi(id)
            .catch(onSyncError('Nepavyko ištrinti treniruotės.'));
        },

        setTrainingStatus: (id, status) => {
          set({
            trainingSessions: get().trainingSessions.map((t) =>
              t.id === id ? { ...t, status } : t,
            ),
          });
          apiEndpoints
            .patchTraining(id, { status })
            .catch(onSyncError('Nepavyko pakeisti būsenos.'));
        },

        upsertPlan: (plan) => {
          const exists = get().trainingPlans.some((p) => p.id === plan.id);
          set({
            trainingPlans: exists
              ? get().trainingPlans.map((p) => (p.id === plan.id ? { ...plan } : p))
              : [...get().trainingPlans, plan],
          });
          apiEndpoints.upsertPlanApi(plan).catch(onSyncError('Nepavyko išsaugoti plano.'));
        },

        publishPlan: (planId) => {
          set({
            trainingPlans: get().trainingPlans.map((p) =>
              p.id === planId ? { ...p, status: 'published', updatedAt: todayIso() } : p,
            ),
          });
          apiEndpoints
            .publishPlanApi(planId)
            .catch(onSyncError('Nepavyko publikuoti plano.'));
        },

        deletePlan: (planId) => {
          set({ trainingPlans: get().trainingPlans.filter((p) => p.id !== planId) });
          apiEndpoints.deletePlanApi(planId).catch(onSyncError('Nepavyko ištrinti plano.'));
        },

        addLeaderboardCategory: (c) => {
          const newC: LeaderboardCategory = { ...c, id: genId('lb-') };
          set({ leaderboardCategories: [...get().leaderboardCategories, newC] });
          apiEndpoints
            .createCategoryApi(newC)
            .catch(onSyncError('Nepavyko sukurti kategorijos.'));
          return newC;
        },

        updateLeaderboardCategory: (id, patch) => {
          set({
            leaderboardCategories: get().leaderboardCategories.map((c) =>
              c.id === id ? { ...c, ...patch } : c,
            ),
          });
          apiEndpoints
            .patchCategoryApi(id, patch)
            .catch(onSyncError('Nepavyko atnaujinti kategorijos.'));
        },

        archiveLeaderboardCategory: (id) => {
          set({
            leaderboardCategories: get().leaderboardCategories.map((c) =>
              c.id === id ? { ...c, archived: true } : c,
            ),
          });
          apiEndpoints
            .patchCategoryApi(id, { archived: true })
            .catch(onSyncError('Nepavyko archyvuoti kategorijos.'));
        },

        addLeaderboardResult: (r) => {
          const newR: LeaderboardResult = { ...r, id: genId('r-') };
          set({ leaderboardResults: [...get().leaderboardResults, newR] });
          apiEndpoints
            .createResultApi(newR)
            .catch(onSyncError('Nepavyko pridėti rezultato.'));
          return newR;
        },

        updateLeaderboardResult: (id, patch) => {
          set({
            leaderboardResults: get().leaderboardResults.map((r) =>
              r.id === id ? { ...r, ...patch } : r,
            ),
          });
          apiEndpoints
            .patchResultApi(id, patch)
            .catch(onSyncError('Nepavyko atnaujinti rezultato.'));
        },

        removeLeaderboardResult: (id) => {
          set({ leaderboardResults: get().leaderboardResults.filter((r) => r.id !== id) });
          apiEndpoints
            .deleteResultApi(id)
            .catch(onSyncError('Nepavyko pašalinti rezultato.'));
        },

        setPaymentStatus: (memberId, status) => {
          // Payments are client-side only for now (backend feature skipped).
          const iso = todayIso();
          set({
            members: get().members.map((m) =>
              m.id === memberId
                ? {
                    ...m,
                    paymentStatus: status,
                    lastPaymentDate: status === 'paid' ? iso : m.lastPaymentDate,
                  }
                : m,
            ),
            payments: get().payments.map((p) =>
              p.memberId === memberId
                ? {
                    ...p,
                    status,
                    paidDate: status === 'paid' ? iso : undefined,
                  }
                : p,
            ),
          });
        },

        addCoachNote: (memberId, note) => {
          set({
            members: get().members.map((m) =>
              m.id === memberId ? { ...m, coachNotes: note } : m,
            ),
          });
          apiEndpoints
            .patchMember(memberId, { coachNotes: note })
            .catch(onSyncError('Nepavyko išsaugoti užrašo.'));
        },

        addMembershipPlan: async (input) => {
          try {
            const plan = await apiEndpoints.createMembershipPlanApi(input);
            set({ membershipPlans: [...get().membershipPlans, plan] });
            return { ok: true };
          } catch (err) {
            const message =
              err instanceof ApiError ? err.message : 'Nepavyko sukurti plano.';
            return { ok: false, error: message };
          }
        },

        removeMembershipPlan: (id) => {
          // Optimistically drop the plan and unassign it from any members
          // (mirrors the backend's ON DELETE SET NULL behaviour).
          set({
            membershipPlans: get().membershipPlans.filter((p) => p.id !== id),
            members: get().members.map((m) =>
              m.membershipPlanId === id ? { ...m, membershipPlanId: '' } : m,
            ),
          });
          apiEndpoints
            .deleteMembershipPlanApi(id)
            .catch(onSyncError('Nepavyko ištrinti plano.'));
        },
      };
    },
    {
      name: 'paceclub-prototype-v2',
      version: 12,
      // Only auth/session state is persisted locally; all domain data lives in
      // the DB and is re-fetched on bootstrap.
      partialize: (s) => ({
        token: s.token,
        authUser: s.authUser,
        role: s.role,
        currentMemberId: s.currentMemberId,
        currentCoachId: s.currentCoachId,
      }),
    },
  ),
);

// Selector helpers. `login`/`bootstrap` finish loading domain data before the
// authenticated routes mount, so by the time any page reads these the arrays
// are populated and the result is defined.
export function useCurrentMember(): Member {
  return useStore((s) => s.members.find((m) => m.id === s.currentMemberId) ?? s.members[0]);
}

export function useCurrentCoach(): CoachStaff {
  return useStore((s) => s.coaches.find((c) => c.id === s.currentCoachId) ?? s.coaches[0]);
}
