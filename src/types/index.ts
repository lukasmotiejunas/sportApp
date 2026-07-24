export type Role = 'member' | 'coach' | 'admin' | 'super_admin';

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  name?: string;
  clubId?: string;
  clubName?: string;
  memberId?: string;
  coachId?: string;
};

export type Club = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

export type ClubSummary = Club & {
  memberCount: number;
  coachCount: number;
  userCount: number;
  mrr: number;
};

export type ClubDetail = Club & {
  counts: {
    members: number;
    coaches: number;
    users: number;
    trainingSessions: number;
    membershipPlans: number;
  };
  mrr: number;
  admins: { id: string; email: string; name?: string; createdAt: string }[];
  members: {
    id: string;
    name: string;
    email: string;
    paymentStatus: PaymentStatus;
    planName: string | null;
    monthlyFee: number;
  }[];
  coaches: { id: string; name: string; specialty: string }[];
};

export type SuperAdminStats = {
  clubs: number;
  members: number;
  coaches: number;
  mrr: number;
};

export type PaymentStatus = 'paid' | 'overdue' | 'pending';

export type MembershipPlan = {
  id: string;
  name: string;
  monthlyFee: number;
  currency: string;
};

export type Gender = 'male' | 'female' | 'unspecified';

export type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  memberSince: string;
  avatarColor: string;
  initials: string;
  photoUrl?: string;
  gender: Gender;
  ageGroup: string;
  membershipPlanId: string;
  paymentStatus: PaymentStatus;
  paymentDueDate: string;
  lastPaymentDate: string;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  coachNotes?: string;
};

export type CoachStaff = {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  specialty: string;
};

export type TrainingRegistration = {
  memberId: string;
  registeredAt: string;
};

export type TrainingSession = {
  id: string;
  title: string;
  description: string;
  date: string; // ISO date, e.g. 2026-07-16
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location: string;
  coachId: string;
  capacity: number;
  registrationDeadline: string;
  goals: string[];
  whatToBring: string[];
  registrations: TrainingRegistration[];
  status: 'open' | 'closed' | 'cancelled';
};

export type TrainingPlan = {
  id: string;
  memberId: string;
  trainingSessionId: string;
  title: string;
  duration: number; // minutes
  coachNote: string;
  plan: string;
  status: 'draft' | 'published';
  updatedAt: string;
};

export type LeaderboardCategory = {
  id: string;
  name: string;
  event: string; // e.g. "100m"
  measurementType: 'seconds' | 'ms' | 'distance_km' | 'points';
  unit: string;
  lowerIsBetter: boolean;
  genderCategory: Gender | 'all';
  archived: boolean;
};

export type LeaderboardResult = {
  id: string;
  categoryId: string;
  memberId: string;
  value: number; // for seconds/ms use raw seconds; distance km; etc.
  date: string;
  note?: string;
};

export type Payment = {
  id: string;
  memberId: string;
  amount: number;
  currency: string;
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  planId: string;
  method?: string;
};

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export type ToastRecord = {
  id: string;
  message: string;
  kind: ToastKind;
};
