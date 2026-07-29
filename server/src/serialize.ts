import type {
  Club,
  Coach,
  LeaderboardCategory,
  LeaderboardResult,
  Member,
  MembershipPlan,
  Prisma,
  TrainingPlan,
  TrainingRegistration,
  TrainingSession,
  User,
} from '@prisma/client';

// A @db.Date column comes back as a Date at UTC midnight -> "YYYY-MM-DD".
function toDateString(d: Date | null): string | undefined {
  if (!d) return undefined;
  return d.toISOString().slice(0, 10);
}

function toNumber(d: Prisma.Decimal): number {
  return Number(d);
}

// Never expose passwordHash to clients.
export function serializeUser(u: User & { club?: Club | null }) {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    name: u.name ?? undefined,
    clubId: u.clubId ?? undefined,
    clubName: u.club?.name ?? undefined,
    clubSlug: u.club?.slug ?? undefined,
    memberId: u.memberId ?? undefined,
    coachId: u.coachId ?? undefined,
  };
}

export function serializeClub(c: Club) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    createdAt: c.createdAt.toISOString(),
  };
}

export function serializeMembershipPlan(p: MembershipPlan) {
  return {
    id: p.id,
    name: p.name,
    monthlyFee: toNumber(p.monthlyFee),
    currency: p.currency,
    planType: p.planType,
    // Only set for credit-pack plans. null for monthly plans.
    creditCount: p.creditCount ?? null,
    // null = unlimited weekly trainings.
    trainingsPerWeek: p.trainingsPerWeek ?? null,
    // null = not yet mirrored on club's Stripe Connect account.
    stripePriceId: p.stripePriceId ?? null,
  };
}

export function serializeCoach(c: Coach) {
  return {
    id: c.id,
    name: c.name,
    initials: c.initials ?? '',
    avatarColor: c.avatarColor ?? 'bg-slate-500',
    specialty: c.specialty ?? '',
  };
}

export function serializeMember(m: Member) {
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    phone: m.phone ?? '',
    dateOfBirth: toDateString(m.dateOfBirth) ?? '',
    memberSince: toDateString(m.memberSince) ?? '',
    avatarColor: m.avatarColor ?? 'bg-slate-500',
    initials: m.initials ?? '',
    photoUrl: m.photoUrl ?? undefined,
    gender: m.gender,
    ageGroup: m.ageGroup ?? '',
    membershipPlanId: m.membershipPlanId ?? '',
    paymentStatus: m.paymentStatus,
    paymentDueDate: toDateString(m.paymentDueDate) ?? '',
    lastPaymentDate: toDateString(m.lastPaymentDate) ?? '',
    notificationPreferences: {
      email: m.notifyEmail,
      sms: m.notifySms,
      push: m.notifyPush,
    },
    coachNotes: m.coachNotes ?? undefined,
    // Presence signals that payment status is auto-driven by Stripe webhooks —
    // the admin's manual paid/overdue toggle should be disabled for this member.
    stripeSubscriptionId: m.stripeSubscriptionId ?? null,
    // Only relevant for credit-pack plan members. null = not applicable.
    creditsRemaining: m.creditsRemaining ?? null,
  };
}

export function serializeTraining(
  t: TrainingSession & { registrations: TrainingRegistration[] },
) {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? '',
    date: toDateString(t.date) ?? '',
    startTime: t.startTime,
    endTime: t.endTime,
    location: t.location ?? '',
    coachId: t.coachId,
    capacity: t.capacity,
    registrationDeadline: toDateString(t.registrationDeadline) ?? toDateString(t.date) ?? '',
    goals: t.goals,
    whatToBring: t.whatToBring,
    registrations: t.registrations.map((r) => ({
      memberId: r.memberId,
      registeredAt: r.registeredAt.toISOString(),
    })),
    status: t.status,
  };
}

export function serializeTrainingPlan(p: TrainingPlan) {
  return {
    id: p.id,
    memberId: p.memberId,
    trainingSessionId: p.trainingSessionId ?? '',
    title: p.title,
    duration: p.durationMinutes ?? 0,
    coachNote: p.coachNote ?? '',
    plan: p.planBody ?? '',
    status: p.status,
    updatedAt: toDateString(p.updatedAt) ?? '',
  };
}

export function serializeLeaderboardCategory(c: LeaderboardCategory) {
  return {
    id: c.id,
    name: c.name,
    event: c.event,
    measurementType: c.measurementType,
    unit: c.unit,
    lowerIsBetter: c.lowerIsBetter,
    genderCategory: c.genderCategory,
    archived: c.archived,
  };
}

export function serializeLeaderboardResult(r: LeaderboardResult) {
  return {
    id: r.id,
    categoryId: r.categoryId,
    memberId: r.memberId,
    value: toNumber(r.value),
    date: toDateString(r.date) ?? '',
    note: r.note ?? undefined,
  };
}
