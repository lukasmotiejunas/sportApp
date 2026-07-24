import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
// Reuse the exact same mock arrays the frontend prototype used, so the
// database starts life with identical data.
import {
  coachStaff,
  leaderboardCategories,
  leaderboardResults,
  members,
  membershipPlans,
  trainingPlans,
  trainingSessions,
} from '../../src/data/mockData';

const prisma = new PrismaClient();

// Fixed IDs so re-running the seed is idempotent even across schema resets.
const DEFAULT_CLUB_ID = 'club_default';

async function main() {
  // Wipe existing data (reverse dependency order) so the seed is idempotent.
  await prisma.user.deleteMany();
  await prisma.leaderboardResult.deleteMany();
  await prisma.leaderboardCategory.deleteMany();
  await prisma.trainingPlan.deleteMany();
  await prisma.trainingRegistration.deleteMany();
  await prisma.trainingSession.deleteMany();
  await prisma.member.deleteMany();
  await prisma.coach.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.club.deleteMany();

  // 0a. The default demo club.
  await prisma.club.create({
    data: {
      id: DEFAULT_CLUB_ID,
      name: 'Default Club',
      slug: 'default',
    },
  });

  // 0b. Super admin (platform owner) — no club, sees all clubs.
  const superEmail = (process.env.SUPER_ADMIN_EMAIL ?? 'lukas@kartel.ai').toLowerCase();
  const superPassword = process.env.SUPER_ADMIN_PASSWORD ?? 'super-admin-123';
  await prisma.user.create({
    data: {
      email: superEmail,
      passwordHash: await bcrypt.hash(superPassword, 10),
      role: 'super_admin',
      name: 'Platform Owner',
    },
  });

  // 0c. Default club admin (existing legacy login).
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@sportapp.lt').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: 'admin',
      name: 'Administratorius',
      clubId: DEFAULT_CLUB_ID,
    },
  });

  // 1. Membership plans
  await prisma.membershipPlan.createMany({
    data: membershipPlans.map((p) => ({
      id: p.id,
      clubId: DEFAULT_CLUB_ID,
      name: p.name,
      monthlyFee: p.monthlyFee,
      currency: p.currency,
    })),
  });

  // 2. Coaches
  await prisma.coach.createMany({
    data: coachStaff.map((c) => ({
      id: c.id,
      clubId: DEFAULT_CLUB_ID,
      name: c.name,
      specialty: c.specialty,
      avatarColor: c.avatarColor,
      initials: c.initials,
    })),
  });

  // 3. Members
  await prisma.member.createMany({
    data: members.map((m) => ({
      id: m.id,
      clubId: DEFAULT_CLUB_ID,
      name: m.name,
      email: m.email,
      phone: m.phone,
      dateOfBirth: new Date(m.dateOfBirth),
      memberSince: new Date(m.memberSince),
      gender: m.gender,
      ageGroup: m.ageGroup,
      avatarColor: m.avatarColor,
      initials: m.initials,
      photoUrl: m.photoUrl ?? null,
      coachNotes: m.coachNotes ?? null,
      membershipPlanId: m.membershipPlanId,
      paymentStatus: m.paymentStatus,
      paymentDueDate: new Date(m.paymentDueDate),
      lastPaymentDate: new Date(m.lastPaymentDate),
      notifyEmail: m.notificationPreferences.email,
      notifySms: m.notificationPreferences.sms,
      notifyPush: m.notificationPreferences.push,
    })),
  });

  // 4. Training sessions (+ nested registrations)
  for (const t of trainingSessions) {
    await prisma.trainingSession.create({
      data: {
        id: t.id,
        clubId: DEFAULT_CLUB_ID,
        title: t.title,
        description: t.description,
        date: new Date(t.date),
        startTime: t.startTime,
        endTime: t.endTime,
        location: t.location,
        coachId: t.coachId,
        capacity: t.capacity,
        registrationDeadline: new Date(t.registrationDeadline),
        goals: t.goals,
        whatToBring: t.whatToBring,
        status: t.status,
        registrations: {
          create: t.registrations.map((r) => ({
            memberId: r.memberId,
            registeredAt: new Date(r.registeredAt),
          })),
        },
      },
    });
  }

  // 5. Training plans
  await prisma.trainingPlan.createMany({
    data: trainingPlans.map((p) => ({
      id: p.id,
      memberId: p.memberId,
      trainingSessionId: p.trainingSessionId,
      title: p.title,
      durationMinutes: p.duration,
      coachNote: p.coachNote,
      planBody: p.plan,
      status: p.status,
    })),
  });

  // 6. Leaderboard categories
  await prisma.leaderboardCategory.createMany({
    data: leaderboardCategories.map((c) => ({
      id: c.id,
      clubId: DEFAULT_CLUB_ID,
      name: c.name,
      event: c.event,
      measurementType: c.measurementType,
      unit: c.unit,
      lowerIsBetter: c.lowerIsBetter,
      genderCategory: c.genderCategory === 'unspecified' ? 'all' : c.genderCategory,
      archived: c.archived,
    })),
  });

  // 7. Leaderboard results
  await prisma.leaderboardResult.createMany({
    data: leaderboardResults.map((r) => ({
      id: r.id,
      categoryId: r.categoryId,
      memberId: r.memberId,
      value: r.value,
      date: new Date(r.date),
      note: r.note ?? null,
    })),
  });

  const counts = {
    clubs: await prisma.club.count(),
    users: await prisma.user.count(),
    membershipPlans: await prisma.membershipPlan.count(),
    coaches: await prisma.coach.count(),
    members: await prisma.member.count(),
    trainingSessions: await prisma.trainingSession.count(),
    registrations: await prisma.trainingRegistration.count(),
    trainingPlans: await prisma.trainingPlan.count(),
    leaderboardCategories: await prisma.leaderboardCategory.count(),
    leaderboardResults: await prisma.leaderboardResult.count(),
  };
  console.log('Seed complete:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
