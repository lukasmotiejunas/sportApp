import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireClubId, requireRole } from '../middleware/auth.js';
import { serializeMember } from '../serialize.js';
import { hashPassword } from '../auth/password.js';
import { initialsFromName, randomAvatarColor } from '../util.js';

export const membersRouter = Router();

const notificationPreferencesSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
  push: z.boolean(),
});

// Accepts a partial member (FE `updateMember` / `addCoachNote` shape).
const updateMemberSchema = z
  .object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string(),
    dateOfBirth: z.string(),
    gender: z.enum(['male', 'female', 'unspecified']),
    ageGroup: z.string(),
    avatarColor: z.string(),
    initials: z.string(),
    photoUrl: z.string(),
    coachNotes: z.string(),
    membershipPlanId: z.string(),
    notificationPreferences: notificationPreferencesSchema,
  })
  .partial();

membersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const members = await prisma.member.findMany({
      where: { clubId },
      orderBy: { name: 'asc' },
    });
    res.json(members.map(serializeMember));
  }),
);

const createMemberSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'unspecified']).optional(),
  ageGroup: z.string().optional(),
  membershipPlanId: z.string().optional(),
});

// Admin-only: create a Member profile + a linked login (User).
membersRouter.post(
  '/',
  requireRole('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const data = createMemberSchema.parse(req.body);
    const email = data.email.toLowerCase();

    const [existingUser, existingMember] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.member.findUnique({ where: { email } }),
    ]);
    if (existingUser || existingMember) {
      throw new HttpError(409, 'Vartotojas su tokiu el. paštu jau egzistuoja.');
    }

    // If a membershipPlanId is provided, it must belong to this club.
    if (data.membershipPlanId) {
      const plan = await prisma.membershipPlan.findFirst({
        where: { id: data.membershipPlanId, clubId },
      });
      if (!plan) throw new HttpError(400, 'Narystės planas nepriskirtas šiam klubui.');
    }

    const passwordHash = await hashPassword(data.password);

    const member = await prisma.member.create({
      data: {
        clubId,
        name: data.name,
        email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender ?? 'unspecified',
        ageGroup: data.ageGroup,
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
            clubId,
          },
        },
      },
    });

    res.status(201).json(serializeMember(member));
  }),
);

membersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const member = await prisma.member.findFirst({
      where: { id: req.params.id, clubId },
    });
    if (!member) throw new HttpError(404, 'Narys nerastas');
    res.json(serializeMember(member));
  }),
);

// Admin-only: permanently delete a Member. Prisma cascades remove the linked
// User, training registrations, individual training plans, and leaderboard
// results in a single statement.
membersRouter.delete(
  '/:id',
  requireRole('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const existing = await prisma.member.findFirst({
      where: { id: req.params.id, clubId },
    });
    if (!existing) throw new HttpError(404, 'Narys nerastas');
    await prisma.member.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

membersRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const patch = updateMemberSchema.parse(req.body);
    const { notificationPreferences, dateOfBirth, membershipPlanId, ...rest } = patch;

    // Verify the target member belongs to this club before touching it.
    const existing = await prisma.member.findFirst({
      where: { id: req.params.id, clubId },
    });
    if (!existing) throw new HttpError(404, 'Narys nerastas');

    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(dateOfBirth !== undefined
          ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
          : {}),
        ...(membershipPlanId !== undefined
          ? { membershipPlanId: membershipPlanId || null }
          : {}),
        ...(notificationPreferences
          ? {
              notifyEmail: notificationPreferences.email,
              notifySms: notificationPreferences.sms,
              notifyPush: notificationPreferences.push,
            }
          : {}),
      },
    });

    res.json(serializeMember(member));
  }),
);
