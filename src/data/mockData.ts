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
  { id: 'plan-unlimited', name: 'Neribotas bėgimo klubas', monthlyFee: 49, currency: 'EUR', planType: 'monthly', creditCount: null, trainingsPerWeek: null, stripePriceId: null },
  { id: 'plan-lite', name: 'Savaitgalio bėgikas', monthlyFee: 29, currency: 'EUR', planType: 'monthly', creditCount: null, trainingsPerWeek: 2, stripePriceId: null },
];

export const coachStaff: CoachStaff[] = [
  { id: 'coach-1', name: 'Coach Elena Ruiz', initials: 'ER', avatarColor: 'bg-orange-500', specialty: 'Sprintas ir technika' },
  { id: 'coach-2', name: 'Coach Marcus Bell', initials: 'MB', avatarColor: 'bg-sky-500', specialty: 'Ištvermė' },
  { id: 'coach-3', name: 'Coach Anya Petrova', initials: 'AP', avatarColor: 'bg-fuchsia-500', specialty: 'Jėga ir atsigavimas' },
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
  { id: 'm-alex', name: 'Alex Morgan', gender: 'female', ageGroup: 'Suaugusiųjų', paymentStatus: 'paid' },
  { id: 'm-jamie', name: 'Jamie Chen', gender: 'male', ageGroup: 'Suaugusiųjų', paymentStatus: 'paid' },
  { id: 'm-sam', name: 'Samira Okafor', gender: 'female', ageGroup: 'Suaugusiųjų', paymentStatus: 'paid' },
  { id: 'm-lucas', name: 'Lucas Bernard', gender: 'male', ageGroup: 'Veteranai 40+', paymentStatus: 'paid' },
  { id: 'm-mia', name: 'Mia Johansson', gender: 'female', ageGroup: 'Suaugusiųjų', paymentStatus: 'paid' },
  { id: 'm-david', name: 'David Park', gender: 'male', ageGroup: 'Suaugusiųjų', paymentStatus: 'overdue' },
  { id: 'm-nora', name: 'Nora Fischer', gender: 'female', ageGroup: 'Suaugusiųjų', paymentStatus: 'paid' },
  { id: 'm-jonas', name: 'Jonas Weber', gender: 'male', ageGroup: 'Suaugusiųjų', paymentStatus: 'paid' },
  { id: 'm-priya', name: 'Priya Kapoor', gender: 'female', ageGroup: 'Suaugusiųjų', paymentStatus: 'paid' },
  { id: 'm-tomas', name: 'Tomas Lindqvist', gender: 'male', ageGroup: 'Veteranai 40+', paymentStatus: 'paid' },
  { id: 'm-yuki', name: 'Yuki Tanaka', gender: 'female', ageGroup: 'Suaugusiųjų', paymentStatus: 'paid' },
  { id: 'm-omar', name: 'Omar Haddad', gender: 'male', ageGroup: 'Suaugusiųjų', paymentStatus: 'paid' },
  { id: 'm-clara', name: 'Clara Rossi', gender: 'female', ageGroup: 'Jauniai', paymentStatus: 'paid' },
  { id: 'm-noah', name: 'Noah Larsen', gender: 'male', ageGroup: 'Suaugusiųjų', paymentStatus: 'paid' },
  { id: 'm-isla', name: 'Isla Murphy', gender: 'female', ageGroup: 'Suaugusiųjų', paymentStatus: 'overdue' },
  { id: 'm-diego', name: 'Diego Alvarez', gender: 'male', ageGroup: 'Suaugusiųjų', paymentStatus: 'paid' },
  { id: 'm-hana', name: 'Hana Novak', gender: 'female', ageGroup: 'Veteranai 40+', paymentStatus: 'paid' },
  { id: 'm-erik', name: 'Erik Sundberg', gender: 'male', ageGroup: 'Suaugusiųjų', paymentStatus: 'paid' },
  { id: 'm-fatima', name: 'Fatima Ndiaye', gender: 'female', ageGroup: 'Suaugusiųjų', paymentStatus: 'paid' },
  { id: 'm-leo', name: 'Leo Kowalski', gender: 'male', ageGroup: 'Jauniai', paymentStatus: 'paid' },
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
    gender: seed.gender,
    ageGroup: seed.ageGroup,
    membershipPlanId: i % 5 === 0 ? 'plan-lite' : 'plan-unlimited',
    paymentStatus: seed.paymentStatus ?? 'paid',
    paymentDueDate:
      seed.paymentStatus === 'overdue' ? addDays(today, -6) : addDays(today, 14),
    lastPaymentDate: seed.paymentStatus === 'paid' ? addDays(today, -12) : addDays(today, -42),
    notificationPreferences: { email: true, sms: false, push: true },
    coachNotes: i % 4 === 0 ? 'Susikoncentruokite į atpalaiduotus pečius ir kontroliuojamą greitėjimą.' : undefined,
  };
});

function buildTraining(
  overrides: Partial<TrainingSession> & { id: string; date: string },
  registeredMemberIds: string[] = [],
): TrainingSession {
  return {
    id: overrides.id,
    title: overrides.title ?? 'Treniruotė',
    description:
      overrides.description ??
      'Susitelkusi klubo treniruotė, vedama mūsų trenerių. Ateikite pasišildę ir pasiruošę judėti — kiekviena treniruotė suplanuota pamatuojamai pažangai.',
    date: overrides.date,
    startTime: overrides.startTime ?? '18:30',
    endTime: overrides.endTime ?? '19:45',
    location: overrides.location ?? 'Centrinis lengvosios atletikos stadionas — A aikštė',
    coachId: overrides.coachId ?? 'coach-1',
    capacity: overrides.capacity ?? 30,
    registrationDeadline: overrides.registrationDeadline ?? overrides.date,
    goals:
      overrides.goals ?? [
        'Tobulinti sprinto starto techniką',
        'Padidinti žingsnių dažnį 85 % pastangomis',
        'Sukurti kontroliuojamą greitėjimą per 30 m',
      ],
    whatToBring:
      overrides.whatToBring ?? ['Spygliai ar lengvi bėgimo bateliai', 'Vandens butelis', 'Putų volas (nebūtinas)'],
    registrations: registeredMemberIds.map((id, i) => ({
      memberId: id,
      registeredAt: addDays(today, -1 - i),
    })),
    status: overrides.status ?? 'open',
  };
}

const alexHistorySeeds: Array<{
  offset: number;
  title: string;
  coachId: string;
  extras: string[];
}> = [
  { offset: -2, title: 'Atsigavimo bėgimas', coachId: 'coach-2', extras: ['m-mia', 'm-hana', 'm-nora'] },
  { offset: -4, title: 'Sprinto pratimai', coachId: 'coach-1', extras: ['m-jonas', 'm-erik', 'm-clara'] },
  { offset: -5, title: 'Intervalų pakartojimai', coachId: 'coach-1', extras: ['m-jonas', 'm-yuki', 'm-clara', 'm-mia'] },
  { offset: -8, title: 'Jėga bėgikams', coachId: 'coach-3', extras: ['m-mia', 'm-clara', 'm-hana'] },
  { offset: -10, title: 'Sprinto technika', coachId: 'coach-1', extras: ['m-jonas', 'm-erik', 'm-yuki'] },
  { offset: -12, title: 'Greičio ištvermė', coachId: 'coach-1', extras: ['m-jonas', 'm-diego', 'm-sam'] },
  { offset: -15, title: 'Jėga bėgikams', coachId: 'coach-3', extras: ['m-clara', 'm-mia', 'm-erik'] },
  { offset: -17, title: 'Sprinto technika', coachId: 'coach-1', extras: ['m-yuki', 'm-jonas', 'm-clara'] },
  { offset: -22, title: 'Jėga bėgikams', coachId: 'coach-3', extras: ['m-mia', 'm-erik'] },
  { offset: -24, title: 'Sprinto technika', coachId: 'coach-1', extras: ['m-jonas', 'm-yuki'] },
  { offset: -29, title: 'Sprinto pratimai', coachId: 'coach-1', extras: ['m-clara', 'm-erik'] },
  { offset: -31, title: 'Jėga bėgikams', coachId: 'coach-3', extras: ['m-mia', 'm-clara'] },
  { offset: -36, title: 'Sprinto technika', coachId: 'coach-1', extras: ['m-jonas', 'm-yuki'] },
];

const alexHistorySessions: TrainingSession[] = alexHistorySeeds.map((s, i) =>
  buildTraining(
    {
      id: `t-alex-history-${i}`,
      title: s.title,
      date: addDays(today, s.offset),
      startTime: '18:30',
      endTime: '19:45',
      coachId: s.coachId,
    },
    ['m-alex', ...s.extras],
  ),
);

export const trainingSessions: TrainingSession[] = [
  buildTraining(
    {
      id: 't-sprint-tech',
      title: 'Sprinto technika',
      date: today,
      startTime: '18:30',
      endTime: '19:45',
      coachId: 'coach-1',
      location: 'Centrinis lengvosios atletikos stadionas — A aikštė',
      capacity: 30,
      goals: [
        'Tobulinti sprinto starto techniką',
        'Padidinti žingsnių dažnį 85 % pastangomis',
        'Sukurti kontroliuojamą greitėjimą per 30 m',
      ],
    },
    ['m-alex', 'm-jamie', 'm-mia', 'm-jonas', 'm-yuki', 'm-clara', 'm-erik', 'm-leo', 'm-sam', 'm-diego', 'm-priya', 'm-nora'],
  ),
  buildTraining(
    {
      id: 't-recovery',
      title: 'Lengvas atsigavimo bėgimas',
      date: addDays(today, 1),
      startTime: '07:00',
      endTime: '08:00',
      coachId: 'coach-2',
      location: 'Pakrantės kilpa — rytinis susitikimo taškas',
      capacity: 24,
      goals: ['Aerobinis pagrindas', 'Labai lengvas pokalbio tempas', 'Aktyvus atsigavimas'],
      whatToBring: ['Patogūs bėgimo bateliai', 'Vandens butelis'],
    },
    ['m-lucas', 'm-tomas', 'm-hana', 'm-noah', 'm-fatima', 'm-omar', 'm-priya'],
  ),
  buildTraining(
    {
      id: 't-5k-tempo',
      title: '5 km tempo treniruotė',
      date: addDays(today, 1),
      startTime: '18:00',
      endTime: '19:15',
      coachId: 'coach-2',
      location: 'Centrinis lengvosios atletikos stadionas — B aikštė',
      capacity: 20,
      goals: ['Slenkstinis bėgimas', 'Vienodi tarpiniai laikai — 4:00/km', 'Varžyboms specifinis tempas'],
    },
    ['m-jamie', 'm-tomas', 'm-noah', 'm-lucas', 'm-hana', 'm-priya', 'm-sam', 'm-nora', 'm-fatima'],
  ),
  buildTraining(
    {
      id: 't-strength',
      title: 'Jėga bėgikams',
      date: addDays(today, (6 - new Date().getDay() + 7) % 7 || 5), // Saturday-ish
      startTime: '10:00',
      endTime: '11:00',
      coachId: 'coach-3',
      location: 'Klubo sporto salė — 2 studija',
      capacity: 18,
      goals: ['Užpakalinės kūno grandinės jėga', 'Vienos kojos stabilumas', 'Liemens kontrolė patiriant nuovargį'],
      whatToBring: ['Sportiniai bateliai', 'Rankšluostis', 'Vandens butelis'],
    },
    ['m-alex', 'm-clara', 'm-mia', 'm-priya', 'm-hana', 'm-erik', 'm-yuki', 'm-fatima'],
  ),
  buildTraining(
    {
      id: 't-long-run',
      title: 'Ilgas ištvermės bėgimas',
      date: addDays(today, (7 - new Date().getDay()) % 7 || 6), // Sunday-ish
      startTime: '09:00',
      endTime: '11:00',
      coachId: 'coach-2',
      location: 'Senamiesčio tako pradžia',
      capacity: 25,
      goals: ['Aerobinė ištvermė', 'Maitinimosi praktika', 'Pastovios pastangos 90 min'],
    },
    ['m-jamie', 'm-tomas', 'm-noah', 'm-lucas', 'm-hana', 'm-omar', 'm-diego', 'm-priya', 'm-fatima'],
  ),
  buildTraining(
    {
      id: 't-full-session',
      title: 'Greičio ištvermė 400 m',
      date: addDays(today, 2),
      startTime: '18:30',
      endTime: '19:45',
      coachId: 'coach-1',
      location: 'Centrinis lengvosios atletikos stadionas — A aikštė',
      capacity: 20,
      goals: ['6 × 400 m 90 % pastangomis', 'Pastovūs tarpiniai laikai', 'Laktato tolerancija'],
    },
    Array.from({ length: 20 }, (_, i) => memberSeeds[i]?.id).filter(Boolean) as string[],
  ),
  buildTraining(
    {
      id: 't-limited',
      title: 'Startinių atramų laboratorija',
      date: addDays(today, 3),
      startTime: '17:30',
      endTime: '18:45',
      coachId: 'coach-1',
      location: 'Uždara tiesioji — 1–4 takelis',
      capacity: 12,
      goals: ['Startinių atramų nustatymas', 'Pirmieji 3 žingsniai', 'Postūmio fazės tempas'],
    },
    ['m-alex', 'm-jonas', 'm-yuki', 'm-clara', 'm-erik', 'm-mia', 'm-leo', 'm-jamie', 'm-diego', 'm-sam'],
  ),
  buildTraining(
    {
      id: 't-mobility',
      title: 'Mobilumas ir prevencija',
      date: addDays(today, 4),
      startTime: '07:30',
      endTime: '08:15',
      coachId: 'coach-3',
      location: 'Klubo sporto salė — 1 studija',
      capacity: 20,
      goals: ['Klubų mobilumas', 'Čiurnos judesio amplitudė', 'Aktyvacijos pratimai'],
    },
    ['m-hana', 'm-tomas', 'm-priya', 'm-fatima', 'm-nora'],
  ),

  // past sessions
  buildTraining(
    {
      id: 't-past-1',
      title: 'Sprinto technika',
      date: addDays(today, -3),
      startTime: '18:30',
      endTime: '19:45',
      coachId: 'coach-1',
    },
    ['m-alex', 'm-jonas', 'm-yuki', 'm-clara'],
  ),
  buildTraining(
    {
      id: 't-past-2',
      title: 'Ilgas ištvermės bėgimas',
      date: addDays(today, -5),
      startTime: '09:00',
      endTime: '11:00',
      coachId: 'coach-2',
    },
    ['m-jamie', 'm-tomas', 'm-noah'],
  ),
  buildTraining(
    {
      id: 't-past-3',
      title: 'Jėga bėgikams',
      date: addDays(today, -7),
      startTime: '10:00',
      endTime: '11:00',
      coachId: 'coach-3',
    },
    ['m-alex', 'm-mia', 'm-clara'],
  ),
  buildTraining(
    {
      id: 't-past-4',
      title: '5 km tempo treniruotė',
      date: addDays(today, -10),
      startTime: '18:00',
      endTime: '19:15',
      coachId: 'coach-2',
    },
    ['m-jamie', 'm-tomas', 'm-priya', 'm-sam'],
  ),
  buildTraining(
    {
      id: 't-past-5',
      title: 'Atsigavimo bėgimas',
      date: addDays(today, -12),
      startTime: '07:00',
      endTime: '08:00',
      coachId: 'coach-2',
      status: 'cancelled',
    },
    ['m-hana', 'm-lucas'],
  ),
  ...alexHistorySessions,
];

export const leaderboardCategories: LeaderboardCategory[] = [
  { id: 'lb-60', name: '60 m sprintas', event: '60 m', measurementType: 'seconds', unit: 's', lowerIsBetter: true, genderCategory: 'all', archived: false },
  { id: 'lb-100', name: '100 m sprintas', event: '100 m', measurementType: 'seconds', unit: 's', lowerIsBetter: true, genderCategory: 'all', archived: false },
  { id: 'lb-200', name: '200 m', event: '200 m', measurementType: 'seconds', unit: 's', lowerIsBetter: true, genderCategory: 'all', archived: false },
  { id: 'lb-400', name: '400 m', event: '400 m', measurementType: 'seconds', unit: 's', lowerIsBetter: true, genderCategory: 'all', archived: false },
  { id: 'lb-1k', name: '1 km', event: '1 km', measurementType: 'seconds', unit: 's', lowerIsBetter: true, genderCategory: 'all', archived: false },
  { id: 'lb-5k', name: '5 km', event: '5 km', measurementType: 'seconds', unit: 's', lowerIsBetter: true, genderCategory: 'all', archived: false },
  { id: 'lb-monthly-km', name: 'Mėnesio nuotolis', event: 'Šio mėnesio kilometrai', measurementType: 'distance_km', unit: 'km', lowerIsBetter: false, genderCategory: 'all', archived: false },
];

function makeResult(
  id: string,
  categoryId: string,
  memberId: string,
  value: number,
  dayOffset: number,
): LeaderboardResult {
  return {
    id,
    categoryId,
    memberId,
    value,
    date: addDays(today, dayOffset),
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
  // monthly km
  makeResult('r-km-1', 'lb-monthly-km', 'm-jamie', 124.6, -1),
  makeResult('r-km-2', 'lb-monthly-km', 'm-tomas', 118.2, -1),
  makeResult('r-km-3', 'lb-monthly-km', 'm-noah', 112.8, -1),
  makeResult('r-km-4', 'lb-monthly-km', 'm-hana', 96.4, -1),
  makeResult('r-km-5', 'lb-monthly-km', 'm-priya', 88.5, -1),
  makeResult('r-km-6', 'lb-monthly-km', 'm-alex', 42.5, -1),
  makeResult('r-km-7', 'lb-monthly-km', 'm-lucas', 74.1, -1),
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
  method: m.paymentStatus === 'paid' ? (i % 2 ? 'Visa · 4242' : 'SEPA tiesioginis debetas') : undefined,
}));

export const trainingPlans: TrainingPlan[] = [
  {
    id: 'plan-alex-today',
    memberId: 'm-alex',
    trainingSessionId: 't-sprint-tech',
    title: 'Sprinto technika — Alex',
    duration: 75,
    coachNote: 'Susikoncentruokite į atpalaiduotus pečius ir kontroliuojamus pirmuosius 30 metrų. Pasitikėkite postūmio faze.',
    plan: `Apšilimas (18 min)
- 10 min lengvo bėgimo
- Dinaminis mobilumas: klubų atverimai, čiurnų sukimai, kojų mostai (8 min)

Pagrindinė dalis (35 min)
- 4 × 60 m greitėjimo bėgimai, 2 min ėjimo grįžtant
- 3 × 100 m 85 % pastangomis, 4 min atsigavimo

Technika (12 min)
- 3 × 20 m A šuoliukai, dėmesys kelio pakėlimui
- 3 × 20 m aukšti keliai greitu tempu

Atvėsimas (10 min)
- 8 min lengvo bėgimo ir statinis tempimas`,
    status: 'published',
    updatedAt: addDays(today, -1),
  },
  {
    id: 'plan-jamie-tempo',
    memberId: 'm-jamie',
    trainingSessionId: 't-5k-tempo',
    title: '5 km tempo — Jamie',
    duration: 70,
    coachNote: 'Tolygūs tarpiniai laikai. Kontroliuokite pastangas iki 3 kilometro — linkstate paspartinti.',
    plan: `Apšilimas (15 min)
- Lengvas bėgimas didinant iki slenkstinių pastangų

Pagrindinė dalis
- 5 km tempas siekiant 4:00/km

Atvėsimas (10 min)
- Lengvas bėgimas ir mobilumas`,
    status: 'published',
    updatedAt: addDays(today, -1),
  },
  {
    id: 'plan-mia-sprint',
    memberId: 'm-mia',
    trainingSessionId: 't-sprint-tech',
    title: 'Sprinto technika — Mia',
    duration: 70,
    coachNote: 'Pirmiausia švari technika, tik po to greitis.',
    plan: `Apšilimas (10 min)
- Lengvas bėgimas + mobilumas

Pagrindinė dalis
- 4 × skrydžio 30 m, 3 min atsigavimo tarp pakartojimų`,
    status: 'draft',
    updatedAt: addDays(today, -2),
  },
];
