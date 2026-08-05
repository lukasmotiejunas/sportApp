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
    // null when this member has no linked User row and can't be impersonated.
    userId: string | null;
  }[];
  coaches: {
    id: string;
    name: string;
    specialty: string;
    userId: string | null;
  }[];
};

export type FinancePayment = {
  id: string;
  kind: 'subscription' | 'credits';
  number: string | null;
  memberId: string | null;
  memberName: string | null;
  memberEmail: string | null;
  gross: number;
  stripeFee: number;
  applicationFee: number;
  tax: number;
  net: number;
  currency: string;
  paidAt: string;
  hostedInvoiceUrl: string | null;
};

export type FinanceTotals = {
  gross: number;
  stripeFee: number;
  applicationFee: number;
  tax: number;
  net: number;
  count: number;
};

export type ClubFinances = {
  month: string | null;
  memberPayments: {
    currency: string;
    totals: FinanceTotals;
    list: FinancePayment[];
  };
  clubSubscription: {
    currency: string;
    totals: FinanceTotals;
    list: FinancePayment[];
  };
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
  planType: PlanType;
  // Only meaningful for credit-pack plans (planType='credits'). Total
  // trainings included when purchased. null for monthly plans.
  creditCount: number | null;
  // null = unlimited weekly trainings; otherwise 1..N cap. Only used for
  // monthly plans.
  trainingsPerWeek: number | null;
  // null = plan not yet mirrored to the club's Stripe Connect account.
  stripePriceId: string | null;
};

// monthly = recurring subscription. credits = one-time pack of N trainings.
export type PlanType = 'monthly' | 'credits';

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
  // Set once the member has an active Stripe subscription on the club's
  // connected account. Presence disables the admin's manual paid/overdue
  // toggle for this member (Stripe drives status via webhooks).
  stripeSubscriptionId?: string | null;
  // For credit-pack plan members. null = not applicable (monthly plan or no
  // plan). Any integer >= 0 = trainings still available to register for.
  creditsRemaining?: number | null;
};

export type CoachStaff = {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  specialty: string;
  phone?: string;
  photoUrl?: string;
};

export type RegistrationStatus =
  | 'registered'
  | 'cancelled'
  | 'attended'
  | 'no_show'
  | 'waitlisted';

export type TrainingRegistration = {
  memberId: string;
  registeredAt: string;
  status: RegistrationStatus;
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
  // Shared plan copied to each registered member's TrainingPlan on register.
  // Empty string when the coach didn't set one.
  defaultPlan: string;
  registrations: TrainingRegistration[];
  status: 'open' | 'closed' | 'cancelled';
};

// Reusable pre-filled training definition. When creating a TrainingSession
// the coach can pick a template to auto-fill the form. There's no linkage
// back to the template after the session is created.
export type TrainingTemplate = {
  id: string;
  name: string;
  title: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  capacity: number | null;
  defaultPlan: string;
  updatedAt: string;
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
  measurementType: 'seconds' | 'distance_km' | 'distance_m' | 'minutes' | 'kg';
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
