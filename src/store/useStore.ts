import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  coachStaff,
  leaderboardCategories,
  leaderboardResults,
  members,
  membershipPlans,
  payments,
  trainingPlans,
  trainingSessions,
} from '../data/mockData';
import type {
  AttendanceStatus,
  CoachStaff,
  LeaderboardCategory,
  LeaderboardResult,
  Member,
  MembershipPlan,
  Payment,
  PaymentStatus,
  PlanExercise,
  Role,
  ToastRecord,
  TrainingPlan,
  TrainingSession,
} from '../types';
import { todayIso } from '../utils/dates';

type ToastInput = Omit<ToastRecord, 'id'>;

type State = {
  role: Role | null;
  currentMemberId: string;
  currentCoachId: string;
  darkMode: boolean;

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

  setRole: (role: Role | null) => void;
  setCurrentMemberId: (id: string) => void;
  setCurrentCoachId: (id: string) => void;
  toggleDarkMode: () => void;

  // Member actions
  registerForTraining: (trainingId: string, memberId: string) => { ok: boolean; error?: string };
  cancelRegistration: (trainingId: string, memberId: string) => void;
  toggleExerciseComplete: (planId: string, exerciseId: string) => void;
  setMemberNote: (planId: string, note: string) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
  simulatePayment: (memberId: string) => void;

  // Coach actions
  createTraining: (t: Omit<TrainingSession, 'id' | 'registrations' | 'status'>) => TrainingSession;
  updateTraining: (id: string, patch: Partial<TrainingSession>) => void;
  duplicateTraining: (id: string) => void;
  deleteTraining: (id: string) => void;
  setTrainingStatus: (id: string, status: TrainingSession['status']) => void;
  markAttendance: (trainingId: string, memberId: string, attendance: AttendanceStatus) => void;

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
};

let toastCounter = 0;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      role: null,
      currentMemberId: 'm-alex',
      currentCoachId: 'coach-1',
      darkMode: true,

      members,
      membershipPlans,
      coaches: coachStaff,
      trainingSessions,
      trainingPlans,
      leaderboardCategories,
      leaderboardResults,
      payments,

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

      setRole: (role) => set({ role }),
      setCurrentMemberId: (id) => set({ currentMemberId: id }),
      setCurrentCoachId: (id) => set({ currentCoachId: id }),
      toggleDarkMode: () => {
        const next = !get().darkMode;
        set({ darkMode: next });
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', next);
        }
      },

      registerForTraining: (trainingId, memberId) => {
        const state = get();
        const t = state.trainingSessions.find((x) => x.id === trainingId);
        const m = state.members.find((x) => x.id === memberId);
        if (!t || !m) return { ok: false, error: 'Not found' };
        if (t.status !== 'open') return { ok: false, error: 'Registration is closed for this session.' };
        if (m.paymentStatus === 'overdue') {
          return { ok: false, error: 'Membership payment is overdue.' };
        }
        if (t.registrations.some((r) => r.memberId === memberId)) {
          return { ok: false, error: 'Already registered.' };
        }
        if (t.registrations.length >= t.capacity) {
          return { ok: false, error: 'This session is full.' };
        }
        set({
          trainingSessions: state.trainingSessions.map((x) =>
            x.id === trainingId
              ? {
                  ...x,
                  registrations: [
                    ...x.registrations,
                    { memberId, registeredAt: new Date().toISOString(), attendance: 'unmarked' },
                  ],
                }
              : x,
          ),
        });
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
      },

      toggleExerciseComplete: (planId, exerciseId) => {
        set({
          trainingPlans: get().trainingPlans.map((p) =>
            p.id === planId
              ? {
                  ...p,
                  exercises: p.exercises.map((ex) =>
                    ex.id === exerciseId
                      ? { ...ex, completedByMember: !ex.completedByMember }
                      : ex,
                  ),
                }
              : p,
          ),
        });
      },

      setMemberNote: (planId, note) => {
        set({
          trainingPlans: get().trainingPlans.map((p) =>
            p.id === planId ? { ...p, memberNote: note } : p,
          ),
        });
      },

      updateMember: (id, patch) => {
        set({
          members: get().members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        });
      },

      simulatePayment: (memberId) => {
        const iso = todayIso();
        set({
          members: get().members.map((m) =>
            m.id === memberId
              ? { ...m, paymentStatus: 'paid', lastPaymentDate: iso }
              : m,
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
          id: 't-' + Math.random().toString(36).slice(2, 8),
          registrations: [],
          status: 'open',
        };
        set({ trainingSessions: [newT, ...get().trainingSessions] });
        return newT;
      },

      updateTraining: (id, patch) => {
        set({
          trainingSessions: get().trainingSessions.map((t) =>
            t.id === id ? { ...t, ...patch } : t,
          ),
        });
      },

      duplicateTraining: (id) => {
        const src = get().trainingSessions.find((t) => t.id === id);
        if (!src) return;
        const copy: TrainingSession = {
          ...src,
          id: 't-' + Math.random().toString(36).slice(2, 8),
          title: src.title + ' (copy)',
          registrations: [],
          status: 'open',
        };
        set({ trainingSessions: [copy, ...get().trainingSessions] });
      },

      deleteTraining: (id) => {
        set({ trainingSessions: get().trainingSessions.filter((t) => t.id !== id) });
      },

      setTrainingStatus: (id, status) => {
        set({
          trainingSessions: get().trainingSessions.map((t) =>
            t.id === id ? { ...t, status } : t,
          ),
        });
      },

      markAttendance: (trainingId, memberId, attendance) => {
        set({
          trainingSessions: get().trainingSessions.map((t) =>
            t.id === trainingId
              ? {
                  ...t,
                  registrations: t.registrations.map((r) =>
                    r.memberId === memberId ? { ...r, attendance } : r,
                  ),
                }
              : t,
          ),
        });
      },

      upsertPlan: (plan) => {
        const exists = get().trainingPlans.some((p) => p.id === plan.id);
        if (exists) {
          set({
            trainingPlans: get().trainingPlans.map((p) =>
              p.id === plan.id ? { ...plan } : p,
            ),
          });
        } else {
          set({ trainingPlans: [...get().trainingPlans, plan] });
        }
      },

      publishPlan: (planId) => {
        set({
          trainingPlans: get().trainingPlans.map((p) =>
            p.id === planId ? { ...p, status: 'published', updatedAt: todayIso() } : p,
          ),
        });
      },

      deletePlan: (planId) => {
        set({ trainingPlans: get().trainingPlans.filter((p) => p.id !== planId) });
      },

      addLeaderboardCategory: (c) => {
        const newC: LeaderboardCategory = { ...c, id: 'lb-' + Math.random().toString(36).slice(2, 8) };
        set({ leaderboardCategories: [...get().leaderboardCategories, newC] });
        return newC;
      },

      updateLeaderboardCategory: (id, patch) => {
        set({
          leaderboardCategories: get().leaderboardCategories.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        });
      },

      archiveLeaderboardCategory: (id) => {
        set({
          leaderboardCategories: get().leaderboardCategories.map((c) =>
            c.id === id ? { ...c, archived: true } : c,
          ),
        });
      },

      addLeaderboardResult: (r) => {
        const newR: LeaderboardResult = { ...r, id: 'r-' + Math.random().toString(36).slice(2, 8) };
        set({ leaderboardResults: [...get().leaderboardResults, newR] });
        return newR;
      },

      updateLeaderboardResult: (id, patch) => {
        set({
          leaderboardResults: get().leaderboardResults.map((r) =>
            r.id === id ? { ...r, ...patch } : r,
          ),
        });
      },

      removeLeaderboardResult: (id) => {
        set({ leaderboardResults: get().leaderboardResults.filter((r) => r.id !== id) });
      },

      setPaymentStatus: (memberId, status) => {
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
      },
    }),
    {
      name: 'paceclub-prototype-v2',
      version: 2,
      partialize: (s) => ({
        role: s.role,
        currentMemberId: s.currentMemberId,
        currentCoachId: s.currentCoachId,
        darkMode: s.darkMode,
        members: s.members,
        trainingSessions: s.trainingSessions,
        trainingPlans: s.trainingPlans,
        leaderboardCategories: s.leaderboardCategories,
        leaderboardResults: s.leaderboardResults,
        payments: s.payments,
      }),
    },
  ),
);

// Selector helpers
export function useCurrentMember(): Member {
  return useStore((s) => s.members.find((m) => m.id === s.currentMemberId) ?? s.members[0]);
}

export function useCurrentCoach(): CoachStaff {
  return useStore((s) => s.coaches.find((c) => c.id === s.currentCoachId) ?? s.coaches[0]);
}
