import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireRole } from '../middleware/auth.js';
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
  asyncHandler(async (_req, res) => {
    const members = await prisma.member.findMany({ orderBy: { name: 'asc' } });
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
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = createMemberSchema.parse(req.body);
    const email = data.email.toLowerCase();

    const [existingUser, existingMember] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.member.findUnique({ where: { email } }),
    ]);
    if (existingUser || existingMember) {
      throw new HttpError(409, 'Vartotojas su tokiu el. paštu jau egzistuoja.');
    }

    const passwordHash = await hashPassword(data.password);

    const member = await prisma.member.create({
      data: {
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
    const member = await prisma.member.findUnique({ where: { id: req.params.id } });
    if (!member) throw new HttpError(404, 'Narys nerastas');
    res.json(serializeMember(member));
  }),
);

membersRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const patch = updateMemberSchema.parse(req.body);
    const { notificationPreferences, dateOfBirth, membershipPlanId, ...rest } = patch;

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
