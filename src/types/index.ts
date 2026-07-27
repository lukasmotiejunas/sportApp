export type Role = 'member' | 'coach' | 'admin' | 'super_admin';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled';

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  name?: string;
  clubId?: string;
  clubName?: string;
  clubSlug?: string;
  // Data URL of the club's uploaded logo, or null to fall back to Lumo logo.
  clubLogo?: string | null;
  memberId?: string;
  coachId?: string;
  subscription?: {
    status: SubscriptionStatus;
    trialEndsAt: string;
    currentPeriodEnd: string;
  } | null;
};

export type ClubSubscription = {
  status: SubscriptionStatus;
  monthlyFee: number;
  currency: string;
  trialEndsAt: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  cancelAtPeriodEnd: boolean;
  card: {
    brand: string | null;
    last4: string;
    expMonth: number | null;
    expYear: number | null;
  } | null;
};

export type SubscriptionPayment = {
  id: string;
  number: string | null;
  status: string | null;
  amount: number;
  currency: string;
  created: string;
  paidAt: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
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
  // null = unlimited weekly trainings; otherwise 1..N cap.
  trainingsPerWeek: number | null;
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
