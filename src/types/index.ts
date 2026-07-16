export type Role = 'member' | 'coach';

export type PaymentStatus = 'paid' | 'due_soon' | 'overdue' | 'processing';

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
  emergencyContact: string;
  preferredDistance: string;
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
  darkMode: boolean;
  coachNotes?: string;
};

export type CoachStaff = {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  specialty: string;
};

export type TrainingCategory =
  | 'Sprint'
  | 'Endurance'
  | 'Technique'
  | 'Recovery'
  | 'Strength';

export type TrainingDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused' | 'unmarked';

export type TrainingRegistration = {
  memberId: string;
  registeredAt: string;
  attendance: AttendanceStatus;
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
  category: TrainingCategory;
  difficulty: TrainingDifficulty;
  capacity: number;
  registrationDeadline: string;
  goals: string[];
  whatToBring: string[];
  registrations: TrainingRegistration[];
  status: 'open' | 'closed' | 'cancelled';
};

export type PlanExercise = {
  id: string;
  section: 'warmup' | 'main' | 'technique' | 'cooldown';
  title: string;
  detail: string;
  repetitions?: string;
  distance?: string;
  time?: string;
  pace?: string;
  rest?: string;
  completedByMember?: boolean;
};

export type TrainingPlan = {
  id: string;
  memberId: string;
  trainingSessionId: string;
  title: string;
  intensity: 'Easy' | 'Moderate' | 'Hard' | 'Race pace';
  estimatedDuration: number; // minutes
  coachNote: string;
  memberNote?: string;
  exercises: PlanExercise[];
  status: 'draft' | 'published';
  updatedAt: string;
};

export type LeaderboardCategory = {
  id: string;
  name: string;
  event: string; // e.g. "100m"
  measurementType: 'seconds' | 'ms' | 'distance_km' | 'points' | 'attendance';
  unit: string;
  lowerIsBetter: boolean;
  genderCategory: Gender | 'all';
  ageCategory: string;
  archived: boolean;
};

export type LeaderboardResult = {
  id: string;
  categoryId: string;
  memberId: string;
  value: number; // for seconds/ms use raw seconds; distance km; etc.
  date: string;
  note?: string;
  official: boolean;
  personalBest: boolean;
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
