import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireRole } from '../middleware/auth.js';
import { hashPassword } from '../auth/password.js';
import { serializeClub, serializeUser } from '../serialize.js';

export const superAdminRouter = Router();

// All routes here require super_admin.
superAdminRouter.use(requireRole('super_admin'));

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'club';

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 1;
  // Loop until we find a slug not already used.
  while (await prisma.club.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

// Aggregated stats across all clubs.
superAdminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [clubCount, memberCount, coachCount, mrrAgg] = await Promise.all([
      prisma.club.count(),
      prisma.member.count(),
      prisma.coach.count(),
      prisma.member.findMany({
        where: { membershipPlanId: { not: null }, paymentStatus: 'paid' },
        select: { membershipPlan: { select: { monthlyFee: true } } },
      }),
    ]);

    const mrr = mrrAgg.reduce(
      (sum, m) => sum + Number(m.membershipPlan?.monthlyFee ?? 0),
      0,
    );

    res.json({
      clubs: clubCount,
      members: memberCount,
      coaches: coachCount,
      mrr,
    });
  }),
);

// List every club with headline stats.
superAdminRouter.get(
  '/clubs',
  asyncHandler(async (_req, res) => {
    const clubs = await prisma.club.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { members: true, coaches: true, users: true } },
        members: {
          where: { membershipPlanId: { not: null }, paymentStatus: 'paid' },
          select: { membershipPlan: { select: { monthlyFee: true } } },
        },
      },
    });

    res.json(
      clubs.map((c) => ({
        ...serializeClub(c),
        memberCount: c._count.members,
        coachCount: c._count.coaches,
        userCount: c._count.users,
        mrr: c.members.reduce(
          (sum, m) => sum + Number(m.membershipPlan?.monthlyFee ?? 0),
          0,
        ),
      })),
    );
  }),
);

// Detail view for a single club.
superAdminRouter.get(
  '/clubs/:id',
  asyncHandler(async (req, res) => {
    const club = await prisma.club.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            members: true,
            coaches: true,
            users: true,
            trainingSessions: true,
            membershipPlans: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            paymentStatus: true,
            membershipPlan: { select: { name: true, monthlyFee: true } },
          },
          orderBy: { name: 'asc' },
        },
        coaches: {
          select: { id: true, name: true, specialty: true },
          orderBy: { name: 'asc' },
        },
        users: {
          where: { role: 'admin' },
          select: { id: true, email: true, name: true, createdAt: true },
        },
      },
    });
    if (!club) throw new HttpError(404, 'Club not found');

    const mrr = club.members.reduce(
      (sum, m) =>
        m.paymentStatus === 'paid'
          ? sum + Number(m.membershipPlan?.monthlyFee ?? 0)
          : sum,
      0,
    );

    res.json({
      ...serializeClub(club),
      counts: {
        members: club._count.members,
        coaches: club._count.coaches,
        users: club._count.users,
        trainingSessions: club._count.trainingSessions,
        membershipPlans: club._count.membershipPlans,
      },
      mrr,
      admins: club.users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name ?? undefined,
        createdAt: u.createdAt.toISOString(),
      })),
      members: club.members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        paymentStatus: m.paymentStatus,
        planName: m.membershipPlan?.name ?? null,
        monthlyFee: Number(m.membershipPlan?.monthlyFee ?? 0),
      })),
      coaches: club.coaches.map((c) => ({
        id: c.id,
        name: c.name,
        specialty: c.specialty ?? '',
      })),
    });
  }),
);

const createClubSchema = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
  adminName: z.string().optional(),
});

// Create a new club along with its first admin login.
superAdminRouter.post(
  '/clubs',
  asyncHandler(async (req, res) => {
    const data = createClubSchema.parse(req.body);
    const email = data.adminEmail.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'Vartotojas su tokiu el. paštu jau egzistuoja.');

    const slug = await uniqueSlug(data.slug ? slugify(data.slug) : slugify(data.name));
    const passwordHash = await hashPassword(data.adminPassword);

    const club = await prisma.club.create({
      data: {
        name: data.name,
        slug,
        users: {
          create: {
            email,
            passwordHash,
            role: 'admin',
            name: data.adminName ?? data.name,
          },
        },
      },
      include: { users: true },
    });

    res.status(201).json({
      ...serializeClub(club),
      admin: club.users[0] ? serializeUser(club.users[0]) : null,
    });
  }),
);

// Delete a club and everything under it (cascades via FK).
superAdminRouter.delete(
  '/clubs/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.club.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, 'Club not found');
    await prisma.club.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
