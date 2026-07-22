import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireRole } from '../middleware/auth.js';
import { serializeCoach } from '../serialize.js';
import { hashPassword } from '../auth/password.js';
import { initialsFromName, randomAvatarColor } from '../util.js';

export const coachesRouter = Router();

coachesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const coaches = await prisma.coach.findMany({ orderBy: { name: 'asc' } });
    res.json(coaches.map(serializeCoach));
  }),
);

const createCoachSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  specialty: z.string().optional(),
});

// Admin-only: create a Coach profile + a linked login (User).
coachesRouter.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = createCoachSchema.parse(req.body);
    const email = data.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'Vartotojas su tokiu el. paštu jau egzistuoja.');

    const passwordHash = await hashPassword(data.password);

    const coach = await prisma.coach.create({
      data: {
        name: data.name,
        specialty: data.specialty,
        initials: initialsFromName(data.name),
        avatarColor: randomAvatarColor(),
        user: {
          create: {
            email,
            passwordHash,
            role: 'coach',
            name: data.name,
          },
        },
      },
    });

    res.status(201).json(serializeCoach(coach));
  }),
);
