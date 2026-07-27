import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { hashPassword } from '../auth/password.js';
import { initialsFromName, randomAvatarColor } from '../util.js';
import { serializeMember, serializeMembershipPlan } from '../serialize.js';

export const publicRouter = Router();

// GET /clubs/:slug — public club info + membership plans, used to render the
// join page (no auth). 404 if club doesn't exist or subscription is suspended.
publicRouter.get(
  '/clubs/:slug',
  asyncHandler(async (req, res) => {
    const club = await prisma.club.findUnique({
      where: { slug: req.params.slug },
      include: {
        subscription: { select: { status: true } },
        membershipPlans: { orderBy: { monthlyFee: 'asc' } },
      },
    });
    if (!club) throw new HttpError(404, 'Klubas nerastas.');

    const status = club.subscription?.status;
    if (status === 'past_due' || status === 'cancelled') {
      throw new HttpError(
        403,
        'Šis klubas šiuo metu nepriima naujų narių. Susisiekite su klubo administratoriumi.',
      );
    }

    res.json({
      id: club.id,
      name: club.name,
      slug: club.slug,
      logoUrl: club.logoUrl ?? null,
      plans: club.membershipPlans.map(serializeMembershipPlan),
    });
  }),
);

const joinSchema = z.object({
  name: z.string().min(2, 'Nurodykite vardą ir pavardę.').max(120),
  email: z.string().email('Neteisingas el. paštas.'),
  password: z.string().min(6, 'Slaptažodis turi būti bent 6 simbolių.'),
  phone: z.string().max(40).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'unspecified']).optional(),
  membershipPlanId: z.string().optional(),
  // Fake payment fields — collected for UX only. Not persisted for now.
  bankAccountHolder: z.string().optional(),
  bankAccountIban: z.string().optional(),
});

// POST /clubs/:slug/members — public member registration into an existing
// club. Same effect as an admin using "Pridėti narį", but the member chooses
// their own credentials + plan.
publicRouter.post(
  '/clubs/:slug/members',
  asyncHandler(async (req, res) => {
    const club = await prisma.club.findUnique({
      where: { slug: req.params.slug },
      include: { subscription: { select: { status: true } } },
    });
    if (!club) throw new HttpError(404, 'Klubas nerastas.');
    const status = club.subscription?.status;
    if (status === 'past_due' || status === 'cancelled') {
      throw new HttpError(
        403,
        'Šis klubas šiuo metu nepriima naujų narių. Susisiekite su klubo administratoriumi.',
      );
    }

    const data = joinSchema.parse(req.body);
    const email = data.email.toLowerCase();

    const [existingUser, existingMember] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.member.findUnique({ where: { email } }),
    ]);
    if (existingUser || existingMember) {
      throw new HttpError(409, 'Vartotojas su tokiu el. paštu jau egzistuoja.');
    }

    if (data.membershipPlanId) {
      const plan = await prisma.membershipPlan.findFirst({
        where: { id: data.membershipPlanId, clubId: club.id },
      });
      if (!plan) {
        throw new HttpError(400, 'Pasirinktas planas nepriskirtas šiam klubui.');
      }
    }

    const passwordHash = await hashPassword(data.password);

    const member = await prisma.member.create({
      data: {
        clubId: club.id,
        name: data.name,
        email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender ?? 'unspecified',
        membershipPlanId: data.membershipPlanId || null,
        initials: initialsFromName(data.name),
        avatarColor: randomAvatarColor(),
        paymentStatus: 'pending',
        user: {
          create: {
            email,
            passwordHash,
            role: 'member',
            name: data.name,
            clubId: club.id,
          },
        },
      },
    });

    res.status(201).json({
      member: serializeMember(member),
      club: { id: club.id, name: club.name, slug: club.slug },
      loginUrl: '/login',
    });
  }),
);
