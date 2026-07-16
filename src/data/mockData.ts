import type {
  CoachStaff,
  LeaderboardCategory,
  LeaderboardResult,
  Member,
  MembershipPlan,
  Payment,
  TrainingPlan,
  TrainingSession,
} from '../types';
import { addDays, todayIso } from '../utils/dates';

const today = todayIso();

export const membershipPlans: MembershipPlan[] = [
  { id: 'plan-unlimited', name: 'Running Club Unlimited', monthlyFee: 49, currency: 'EUR' },
  { id: 'plan-lite', name: 'Weekend Runner', monthlyFee: 29, currency: 'EUR' },
];

export const coachStaff: CoachStaff[] = [
  { id: 'coach-1', name: 'Coach Elena Ruiz', initials: 'ER', avatarColor: 'bg-orange-500', specialty: 'Sprint & Technique' },
  { id: 'coach-2', name: 'Coach Marcus Bell', initials: 'MB', avatarColor: 'bg-sky-500', specialty: 'Endurance' },
  { id: 'coach-3', name: 'Coach Anya Petrova', initials: 'AP', avatarColor: 'bg-fuchsia-500', specialty: 'Strength & Recovery' },
];

const colors = [
  'bg-orange-500',
  'bg-sky-500',
  'bg-fuchsia-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-cyan-500',
  'bg-violet-500',
  'bg-teal-500',
];

const memberSeeds: Array<Partial<Member> & { id: string; name: string; gender: Member['gender']; ageGroup: string }> = [
  { id: 'm-alex', name: 'Alex Morgan', gender: 'female', ageGroup: 'Open', preferredDistance: '100 m Sprint', paymentStatus: 'paid' },
  { id: 'm-jamie', name: 'Jamie Chen', gender: 'male', ageGroup: 'Open', preferredDistance: '5 km', paymentStatus: 'paid' },
  { id: 'm-sam', name: 'Samira Okafor', gender: 'female', ageGroup: 'Open', preferredDistance: '400 m', paymentStatus: 'paid' },
  { id: 'm-lucas', name: 'Lucas Bernard', gender: 'male', ageGroup: 'Masters 40+', preferredDistance: '10 km', paymentStatus: 'due_soon' },
  { id: 'm-mia', name: 'Mia Johansson', gender: 'female', ageGroup: 'Open', preferredDistance: '200 m', paymentStatus: 'paid' },
  { id: 'm-david', name: 'David Park', gender: 'male', ageGroup: 'Open', preferredDistance: '5 km', paymentStatus: 'overdue' },
  { id: 'm-nora', name: 'Nora Fischer', gender: 'female', ageGroup: 'Open', preferredDistance: '1 km', paymentStatus: 'paid' },
  { id: 'm-jonas', name: 'Jonas Weber', gender: 'male', ageGroup: 'Open', preferredDistance: '100 m Sprint', paymentStatus: 'paid' },
  { id: 'm-priya', name: 'Priya Kapoor', gender: 'female', ageGroup: 'Open', preferredDistance: '10 km', paymentStatus: 'processing' },
  { id: 'm-tomas', name: 'Tomas Lindqvist', gender: 'male', ageGroup: 'Masters 40+', preferredDistance: '5 km', paymentStatus: 'paid' },
  { id: 'm-yuki', name: 'Yuki Tanaka', gender: 'female', ageGroup: 'Open', preferredDistance: '60 m', paymentStatus: 'paid' },
  { id: 'm-omar', name: 'Omar Haddad', gender: 'male', ageGroup: 'Open', preferredDistance: '400 m', paymentStatus: 'due_soon' },
  { id: 'm-clara', name: 'Clara Rossi', gender: 'female', ageGroup: 'Junior', preferredDistance: '100 m Sprint', paymentStatus: 'paid' },
  { id: 'm-noah', name: 'Noah Larsen', gender: 'male', ageGroup: 'Open', preferredDistance: '5 km', paymentStatus: 'paid' },
  { id: 'm-isla', name: 'Isla Murphy', gender: 'female', ageGroup: 'Open', preferredDistance: '1 km', paymentStatus: 'overdue' },
  { id: 'm-diego', name: 'Diego Alvarez', gender: 'male', ageGroup: 'Open', preferredDistance: '200 m', paymentStatus: 'paid' },
  { id: 'm-hana', name: 'Hana Novak', gender: 'female', ageGroup: 'Masters 40+', preferredDistance: '10 km', paymentStatus: 'paid' },
  { id: 'm-erik', name: 'Erik Sundberg', gender: 'male', ageGroup: 'Open', preferredDistance: '100 m Sprint', paymentStatus: 'paid' },
  { id: 'm-fatima', name: 'Fatima Ndiaye', gender: 'female', ageGroup: 'Open', preferredDistance: '400 m', paymentStatus: 'paid' },
  { id: 'm-leo', name: 'Leo Kowalski', gender: 'male', ageGroup: 'Junior', preferredDistance: '60 m', paymentStatus: 'paid' },
];

export const members: Member[] = memberSeeds.map((seed, i) => {
  const initials = seed.name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return {
    id: seed.id,
    name: seed.name,
    email: seed.name.toLowerCase().replace(/[^a-z]+/g, '.') + '@paceclub.example',
    phone: '+370 6' + String(10000000 + i * 137).slice(0, 8),
    dateOfBirth: '199' + (i % 10) + '-0' + ((i % 9) + 1) + '-1' + (i % 9),
    memberSince: addDays(today, -(120 + i * 17)),
    avatarColor: colors[i % colors.length],
    initials,
    emergencyContact: 'Family Contact · +370 60000000',
    preferredDistance: seed.preferredDistance ?? '5 km',
    gender: seed.gender,
    ageGroup: seed.ageGroup,
    membershipPlanId: i % 5 === 0 ? 'plan-lite' : 'plan-unlimited',
    paymentStatus: seed.paymentStatus ?? 'paid',
    paymentDueDate:
      seed.paymentStatus === 'overdue'
        ? addDays(today, -6)
        : seed.paymentStatus === 'due_soon'
          ? addDays(today, 3)
          : addDays(today, 14),
    lastPaymentDate: seed.paymentStatus === 'paid' ? addDays(today, -12) : addDays(today, -42),
    notificationPreferences: { email: true, sms: false, push: true },
    darkMode: false,
    coachNotes: i % 4 === 0 ? 'Focus on relaxed shoulders and controlled acceleration.' : undefined,
  };
});

function buildTraining(
  overrides: Partial<TrainingSession> & { id: string; date: string },
  registeredMemberIds: string[] = [],
): TrainingSession {
  return {
    id: overrides.id,
    title: overrides.title ?? 'Training',
    description:
      overrides.description ??
      'A focused club session led by our coaching staff. Come warm and ready to move — every session is planned for measurable progress.',
    date: overrides.date,
    startTime: overrides.startTime ?? '18:30',
    endTime: overrides.endTime ?? '19:45',
    location: overrides.location ?? 'Central Athletics Track — Field A',
    coachId: overrides.coachId ?? 'coach-1',
    category: overrides.category ?? 'Sprint',
    difficulty: overrides.difficulty ?? 'Intermediate',
    capacity: overrides.capacity ?? 30,
    registrationDeadline: overrides.registrationDeadline ?? overrides.date,
    goals:
      overrides.goals ?? [
        'Refine sprint start mechanics',
        'Improve stride frequency at 85% effort',
        'Build controlled acceleration through 30m',
      ],
    whatToBring:
      overrides.whatToBring ?? ['Spikes or racing flats', 'Water bottle', 'Foam roller (optional)'],
    registrations: registeredMemberIds.map((id, i) => ({
      memberId: id,
      registeredAt: addDays(today, -1 - i),
      attendance: 'unmarked',
    })),
    status: overrides.status ?? 'open',
  };
}

export const trainingSessions: TrainingSession[] = [
  buildTraining(
    {
      id: 't-sprint-tech',
      title: 'Sprint Technique',
      date: today,
      startTime: '18:30',
      endTime: '19:45',
      category: 'Sprint',
      difficulty: 'Intermediate',
      coachId: 'coach-1',
      location: 'Central Athletics Track — Field A',
      capacity: 30,
      goals: [
        'Refine sprint start mechanics',
        'Improve stride frequency at 85% effort',
        'Build controlled acceleration through 30m',
      ],
    },
    ['m-alex', 'm-jamie', 'm-mia', 'm-jonas', 'm-yuki', 'm-clara', 'm-erik', 'm-leo', 'm-sam', 'm-diego', 'm-priya', 'm-nora'],
  ),
  buildTraining(
    {
      id: 't-recovery',
      title: 'Easy Recovery Run',
      date: addDays(today, 1),
      startTime: '07:00',
      endTime: '08:00',
      category: 'Recovery',
      difficulty: 'Beginner',
      coachId: 'coach-2',
      location: 'Riverside Loop — Meeting Point East',
      capacity: 24,
      goals: ['Aerobic base', 'Very easy conversational pace', 'Active recovery'],
      whatToBring: ['Comfortable trainers', 'Water bottle'],
    },
    ['m-lucas', 'm-tomas', 'm-hana', 'm-noah', 'm-fatima', 'm-omar', 'm-priya'],
  ),
  buildTraining(
    {
      id: 't-5k-tempo',
      title: '5K Tempo Session',
      date: addDays(today, 1),
      startTime: '18:00',
      endTime: '19:15',
      category: 'Endurance',
      difficulty: 'Advanced',
      coachId: 'coach-2',
      location: 'Central Athletics Track — Field B',
      capacity: 20,
      goals: ['Threshold running', 'Even splits at 4:00/km', 'Race-specific pacing'],
    },
    ['m-jamie', 'm-tomas', 'm-noah', 'm-lucas', 'm-hana', 'm-priya', 'm-sam', 'm-nora', 'm-fatima'],
  ),
  buildTraining(
    {
      id: 't-strength',
      title: 'Strength for Runners',
      date: addDays(today, (6 - new Date().getDay() + 7) % 7 || 5), // Saturday-ish
      startTime: '10:00',
      endTime: '11:00',
      category: 'Strength',
      difficulty: 'Intermediate',
      coachId: 'coach-3',
      location: 'Club Gym — Studio 2',
      capacity: 18,
      goals: ['Posterior chain strength', 'Single-leg stability', 'Core control under fatigue'],
      whatToBring: ['Athletic shoes', 'Towel', 'Water bottle'],
    },
    ['m-alex', 'm-clara', 'm-mia', 'm-priya', 'm-hana', 'm-erik', 'm-yuki', 'm-fatima'],
  ),
  buildTraining(
    {
      id: 't-long-run',
      title: 'Long Endurance Run',
      date: addDays(today, (7 - new Date().getDay()) % 7 || 6), // Sunday-ish
      startTime: '09:00',
      endTime: '11:00',
      category: 'Endurance',
      difficulty: 'Advanced',
      coachId: 'coach-2',
      location: 'Old Town Trailhead',
      capacity: 25,
      goals: ['Aerobic endurance', 'Fueling practice', 'Steady effort over 90 min'],
    },
    ['m-jamie', 'm-tomas', 'm-noah', 'm-lucas', 'm-hana', 'm-omar', 'm-diego', 'm-priya', 'm-fatima'],
  ),
  buildTraining(
    {
      id: 't-full-session',
      title: 'Speed Endurance 400s',
      date: addDays(today, 2),
      startTime: '18:30',
      endTime: '19:45',
      category: 'Sprint',
      difficulty: 'Advanced',
      coachId: 'coach-1',
      location: 'Central Athletics Track — Field A',
      capacity: 20,
      goals: ['6 × 400m at 90%', 'Consistent split times', 'Lactate tolerance'],
    },
    Array.from({ length: 20 }, (_, i) => memberSeeds[i]?.id).filter(Boolean) as string[],
  ),
  buildTraining(
    {
      id: 't-limited',
      title: 'Block Start Lab',
      date: addDays(today, 3),
      startTime: '17:30',
      endTime: '18:45',
      category: 'Technique',
      difficulty: 'Advanced',
      coachId: 'coach-1',
      location: 'Indoor Straight — Lane 1-4',
      capacity: 12,
      goals: ['Block set-up', 'First 3 steps', 'Drive phase timing'],
    },
    ['m-alex', 'm-jonas', 'm-yuki', 'm-clara', 'm-erik', 'm-mia', 'm-leo', 'm-jamie', 'm-diego', 'm-sam'],
  ),
  buildTraining(
    {
      id: 't-mobility',
      title: 'Mobility & Prehab',
      date: addDays(today, 4),
      startTime: '07:30',
      endTime: '08:15',
      category: 'Recovery',
      difficulty: 'Beginner',
      coachId: 'coach-3',
      location: 'Club Gym — Studio 1',
      capacity: 20,
      goals: ['Hip mobility', 'Ankle range of motion', 'Activation drills'],
    },
    ['m-hana', 'm-tomas', 'm-priya', 'm-fatima', 'm-nora'],
  ),

  // past sessions
  buildTraining(
    {
      id: 't-past-1',
      title: 'Sprint Technique',
      date: addDays(today, -3),
      startTime: '18:30',
      endTime: '19:45',
      category: 'Sprint',
      difficulty: 'Intermediate',
      coachId: 'coach-1',
    },
    ['m-alex', 'm-jonas', 'm-yuki', 'm-clara'],
  ),
  buildTraining(
    {
      id: 't-past-2',
      title: 'Long Endurance Run',
      date: addDays(today, -5),
      startTime: '09:00',
      endTime: '11:00',
      category: 'Endurance',
      difficulty: 'Advanced',
      coachId: 'coach-2',
    },
    ['m-jamie', 'm-tomas', 'm-noah'],
  ),
  buildTraining(
    {
      id: 't-past-3',
      title: 'Strength for Runners',
      date: addDays(today, -7),
      startTime: '10:00',
      endTime: '11:00',
      category: 'Strength',
      difficulty: 'Intermediate',
      coachId: 'coach-3',
    },
    ['m-alex', 'm-mia', 'm-clara'],
  ),
  buildTraining(
    {
      id: 't-past-4',
      title: '5K Tempo Session',
      date: addDays(today, -10),
      startTime: '18:00',
      endTime: '19:15',
      category: 'Endurance',
      difficulty: 'Advanced',
      coachId: 'coach-2',
    },
    ['m-jamie', 'm-tomas', 'm-priya', 'm-sam'],
  ),
  buildTraining(
    {
      id: 't-past-5',
      title: 'Recovery Run',
      date: addDays(today, -12),
      startTime: '07:00',
      endTime: '08:00',
      category: 'Recovery',
      difficulty: 'Beginner',
      coachId: 'coach-2',
      status: 'cancelled',
    },
    ['m-hana', 'm-lucas'],
  ),
];

export const leaderboardCategories: LeaderboardCategory[] = [
  { id: 'lb-60', name: '60m Sprint', event: '60 m', measurementType: 'seconds', unit: 's', lowerIsBetter: true, genderCategory: 'all', ageCategory: 'All', archived: false },
  { id: 'lb-100', name: '100m Sprint', event: '100 m', measurementType: 'seconds', unit: 's', lowerIsBetter: true, genderCategory: 'all', ageCategory: 'All', archived: false },
  { id: 'lb-200', name: '200m', event: '200 m', measurementType: 'seconds', unit: 's', lowerIsBetter: true, genderCategory: 'all', ageCategory: 'All', archived: false },
  { id: 'lb-400', name: '400m', event: '400 m', measurementType: 'seconds', unit: 's', lowerIsBetter: true, genderCategory: 'all', ageCategory: 'All', archived: false },
  { id: 'lb-1k', name: '1 km', event: '1 km', measurementType: 'seconds', unit: 's', lowerIsBetter: true, genderCategory: 'all', ageCategory: 'All', archived: false },
  { id: 'lb-5k', name: '5 km', event: '5 km', measurementType: 'seconds', unit: 's', lowerIsBetter: true, genderCategory: 'all', ageCategory: 'All', archived: false },
  { id: 'lb-attendance', name: 'Club Attendance', event: 'Sessions attended', measurementType: 'attendance', unit: 'sessions', lowerIsBetter: false, genderCategory: 'all', ageCategory: 'All', archived: false },
  { id: 'lb-monthly-km', name: 'Monthly Distance', event: 'Kilometres this month', measurementType: 'distance_km', unit: 'km', lowerIsBetter: false, genderCategory: 'all', ageCategory: 'All', archived: false },
];

function makeResult(
  id: string,
  categoryId: string,
  memberId: string,
  value: number,
  dayOffset: number,
  personalBest = true,
  official = true,
): LeaderboardResult {
  return {
    id,
    categoryId,
    memberId,
    value,
    date: addDays(today, dayOffset),
    official,
    personalBest,
  };
}

export const leaderboardResults: LeaderboardResult[] = [
  // 100m
  makeResult('r-100-1', 'lb-100', 'm-jonas', 11.42, -14),
  makeResult('r-100-2', 'lb-100', 'm-erik', 11.68, -21),
  makeResult('r-100-3', 'lb-100', 'm-clara', 12.10, -10),
  makeResult('r-100-4', 'lb-100', 'm-alex', 12.42, -8),
  makeResult('r-100-5', 'lb-100', 'm-yuki', 12.55, -20),
  makeResult('r-100-6', 'lb-100', 'm-leo', 12.71, -30),
  makeResult('r-100-7', 'lb-100', 'm-mia', 12.88, -25),
  makeResult('r-100-8', 'lb-100', 'm-jamie', 12.96, -18),
  makeResult('r-100-9', 'lb-100', 'm-diego', 13.05, -12),
  makeResult('r-100-10', 'lb-100', 'm-sam', 13.22, -33),
  makeResult('r-100-11', 'lb-100', 'm-fatima', 13.44, -5),
  // 60m
  makeResult('r-60-1', 'lb-60', 'm-yuki', 7.62, -12),
  makeResult('r-60-2', 'lb-60', 'm-leo', 7.71, -18),
  makeResult('r-60-3', 'lb-60', 'm-jonas', 7.05, -25),
  makeResult('r-60-4', 'lb-60', 'm-clara', 7.55, -14),
  makeResult('r-60-5', 'lb-60', 'm-alex', 7.68, -20),
  makeResult('r-60-6', 'lb-60', 'm-erik', 7.18, -22),
  makeResult('r-60-7', 'lb-60', 'm-mia', 7.83, -28),
  // 200m
  makeResult('r-200-1', 'lb-200', 'm-jonas', 22.68, -30),
  makeResult('r-200-2', 'lb-200', 'm-mia', 25.34, -15),
  makeResult('r-200-3', 'lb-200', 'm-diego', 23.95, -22),
  makeResult('r-200-4', 'lb-200', 'm-clara', 25.10, -12),
  makeResult('r-200-5', 'lb-200', 'm-alex', 25.85, -18),
  makeResult('r-200-6', 'lb-200', 'm-erik', 23.15, -8),
  // 400m
  makeResult('r-400-1', 'lb-400', 'm-sam', 53.71, -12),
  makeResult('r-400-2', 'lb-400', 'm-omar', 51.20, -22),
  makeResult('r-400-3', 'lb-400', 'm-fatima', 54.85, -14),
  makeResult('r-400-4', 'lb-400', 'm-diego', 52.10, -8),
  makeResult('r-400-5', 'lb-400', 'm-jamie', 55.60, -19),
  // 1km
  makeResult('r-1k-1', 'lb-1k', 'm-nora', 174.5, -12),
  makeResult('r-1k-2', 'lb-1k', 'm-isla', 182.4, -18),
  makeResult('r-1k-3', 'lb-1k', 'm-jamie', 170.2, -10),
  makeResult('r-1k-4', 'lb-1k', 'm-noah', 168.8, -22),
  makeResult('r-1k-5', 'lb-1k', 'm-lucas', 179.4, -8),
  makeResult('r-1k-6', 'lb-1k', 'm-tomas', 176.1, -14),
  // 5k
  makeResult('r-5k-1', 'lb-5k', 'm-jamie', 18 * 60 + 42, -18),
  makeResult('r-5k-2', 'lb-5k', 'm-noah', 18 * 60 + 55, -22),
  makeResult('r-5k-3', 'lb-5k', 'm-tomas', 19 * 60 + 12, -14),
  makeResult('r-5k-4', 'lb-5k', 'm-lucas', 20 * 60 + 8, -8),
  makeResult('r-5k-5', 'lb-5k', 'm-priya', 21 * 60 + 45, -30),
  makeResult('r-5k-6', 'lb-5k', 'm-hana', 22 * 60 + 5, -25),
  makeResult('r-5k-7', 'lb-5k', 'm-omar', 19 * 60 + 38, -10),
  makeResult('r-5k-8', 'lb-5k', 'm-david', 21 * 60 + 15, -20),
  // attendance
  makeResult('r-att-1', 'lb-attendance', 'm-jamie', 22, -1, false),
  makeResult('r-att-2', 'lb-attendance', 'm-alex', 20, -1, false),
  makeResult('r-att-3', 'lb-attendance', 'm-mia', 19, -1, false),
  makeResult('r-att-4', 'lb-attendance', 'm-hana', 17, -1, false),
  makeResult('r-att-5', 'lb-attendance', 'm-tomas', 16, -1, false),
  makeResult('r-att-6', 'lb-attendance', 'm-noah', 15, -1, false),
  // monthly km
  makeResult('r-km-1', 'lb-monthly-km', 'm-jamie', 124.6, -1, false),
  makeResult('r-km-2', 'lb-monthly-km', 'm-tomas', 118.2, -1, false),
  makeResult('r-km-3', 'lb-monthly-km', 'm-noah', 112.8, -1, false),
  makeResult('r-km-4', 'lb-monthly-km', 'm-hana', 96.4, -1, false),
  makeResult('r-km-5', 'lb-monthly-km', 'm-priya', 88.5, -1, false),
  makeResult('r-km-6', 'lb-monthly-km', 'm-alex', 42.5, -1, false),
  makeResult('r-km-7', 'lb-monthly-km', 'm-lucas', 74.1, -1, false),
];

export const payments: Payment[] = members.map((m, i) => ({
  id: 'pay-' + m.id,
  memberId: m.id,
  amount: m.membershipPlanId === 'plan-unlimited' ? 49 : 29,
  currency: 'EUR',
  dueDate: m.paymentDueDate,
  paidDate: m.paymentStatus === 'paid' ? m.lastPaymentDate : undefined,
  status: m.paymentStatus,
  planId: m.membershipPlanId,
  method: m.paymentStatus === 'paid' ? (i % 2 ? 'Visa · 4242' : 'SEPA Direct Debit') : undefined,
}));

export const trainingPlans: TrainingPlan[] = [
  {
    id: 'plan-alex-today',
    memberId: 'm-alex',
    trainingSessionId: 't-sprint-tech',
    title: 'Sprint Technique — Alex',
    intensity: 'Hard',
    estimatedDuration: 75,
    coachNote: 'Focus on relaxed shoulders and a controlled first 30 metres. Trust the drive phase.',
    status: 'published',
    updatedAt: addDays(today, -1),
    exercises: [
      { id: 'ex1', section: 'warmup', title: 'Easy jogging', detail: '10 minutes of easy jogging', time: '10 min' },
      { id: 'ex2', section: 'warmup', title: 'Dynamic mobility', detail: 'Hip openers, ankle circles, leg swings', time: '8 min' },
      { id: 'ex3', section: 'main', title: 'Acceleration runs', detail: '4 × 60 m acceleration runs', repetitions: '4×', distance: '60 m', rest: '2 min walk-back' },
      { id: 'ex4', section: 'main', title: '100m at 85% effort', detail: '3 × 100 m at 85% effort', repetitions: '3×', distance: '100 m', rest: '4 min recovery' },
      { id: 'ex5', section: 'technique', title: 'A-skips', detail: '3 × 20 m focus on knee drive', repetitions: '3×', distance: '20 m' },
      { id: 'ex6', section: 'technique', title: 'High knees', detail: '3 × 20 m with quick turnover', repetitions: '3×', distance: '20 m' },
      { id: 'ex7', section: 'cooldown', title: 'Easy jog', detail: '8 minutes of easy jogging', time: '8 min' },
    ],
  },
  {
    id: 'plan-jamie-tempo',
    memberId: 'm-jamie',
    trainingSessionId: 't-5k-tempo',
    title: '5K Tempo — Jamie',
    intensity: 'Hard',
    estimatedDuration: 70,
    coachNote: 'Even splits. Stay controlled through kilometre 3 — you tend to surge.',
    status: 'published',
    updatedAt: addDays(today, -1),
    exercises: [
      { id: 'jt-1', section: 'warmup', title: 'Easy jog', detail: '15 min easy warm up', time: '15 min' },
      { id: 'jt-2', section: 'main', title: '5 km tempo', detail: '5 km at 4:00/km target', distance: '5 km', pace: '4:00/km' },
      { id: 'jt-3', section: 'cooldown', title: 'Cool-down jog', detail: '10 min easy', time: '10 min' },
    ],
  },
  {
    id: 'plan-mia-sprint',
    memberId: 'm-mia',
    trainingSessionId: 't-sprint-tech',
    title: 'Sprint Technique — Mia',
    intensity: 'Moderate',
    estimatedDuration: 70,
    coachNote: 'Prioritise clean mechanics before speed.',
    status: 'draft',
    updatedAt: addDays(today, -2),
    exercises: [
      { id: 'mm-1', section: 'warmup', title: 'Easy jog', detail: '10 min easy', time: '10 min' },
      { id: 'mm-2', section: 'main', title: 'Fly 30s', detail: '4 × fly 30 m', repetitions: '4×', distance: '30 m fly', rest: '3 min' },
    ],
  },
];
