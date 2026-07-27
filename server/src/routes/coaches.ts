import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireClubId, requireRole } from '../middleware/auth.js';
import { serializeCoach } from '../serialize.js';
import { hashPassword } from '../auth/password.js';
import { initialsFromName, randomAvatarColor } from '../util.js';

export const coachesRouter = Router();

coachesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const coaches = await prisma.coach.findMany({
      where: { clubId },
      orderBy: { name: 'asc' },
    });
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
  requireRole('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const data = createCoachSchema.parse(req.body);
    const email = data.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'Vartotojas su tokiu el. paštu jau egzistuoja.');

    const passwordHash = await hashPassword(data.password);

    const coach = await prisma.coach.create({
      data: {
        clubId,
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
            clubId,
          },
        },
      },
    });

    res.status(201).json(serializeCoach(coach));
  }),
);

// Admin-only: permanently delete a Coach. Refuses if the coach still has
// training sessions attached (the TrainingSession.coach FK has no cascade to
// avoid quietly dropping historical data).
coachesRouter.delete(
  '/:id',
  requireRole('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const existing = await prisma.coach.findFirst({
      where: { id: req.params.id, clubId },
    });
    if (!existing) throw new HttpError(404, 'Treneris nerastas');

    const sessionCount = await prisma.trainingSession.count({
      where: { coachId: req.params.id },
    });
    if (sessionCount > 0) {
      throw new HttpError(
        409,
        `Trenerio ištrinti negalima — jam priskirta ${sessionCount} treniruočių. Pirmiausia perskirstykite arba ištrinkite treniruotes.`,
      );
    }

    await prisma.coach.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
