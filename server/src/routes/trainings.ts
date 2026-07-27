import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireClubId } from '../middleware/auth.js';
import { serializeTraining } from '../serialize.js';

export const trainingsRouter = Router();

const trainingBaseSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().optional().default(''),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().optional().default(''),
  coachId: z.string(),
  capacity: z.number().int().nonnegative(),
  registrationDeadline: z.string().optional(),
  goals: z.array(z.string()).optional().default([]),
  whatToBring: z.array(z.string()).optional().default([]),
});

const updateTrainingSchema = trainingBaseSchema
  .extend({
    status: z.enum(['open', 'closed', 'cancelled']),
  })
  .partial();

const withRegistrations = { registrations: true } as const;

// Confirms the given coach belongs to the current club.
async function assertCoachInClub(coachId: string, clubId: string) {
  const coach = await prisma.coach.findFirst({ where: { id: coachId, clubId } });
  if (!coach) throw new HttpError(400, 'Treneris nepriklauso šiam klubui.');
}

// ISO-week bounds (Monday 00:00 → next Monday 00:00) enclosing `date`.
// Prisma @db.Date columns come back as UTC midnight, so we do the math in UTC
// to avoid the day drifting into the previous week in negative timezones.
function isoWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayOfWeek = d.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - daysSinceMonday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return { start, end };
}

trainingsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const trainings = await prisma.trainingSession.findMany({
      where: { clubId },
      include: withRegistrations,
      orderBy: { date: 'asc' },
    });
    res.json(trainings.map(serializeTraining));
  }),
);

trainingsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const training = await prisma.trainingSession.findFirst({
      where: { id: req.params.id, clubId },
      include: withRegistrations,
    });
    if (!training) throw new HttpError(404, 'Treniruotė nerasta');
    res.json(serializeTraining(training));
  }),
);

trainingsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const data = trainingBaseSchema.parse(req.body);
    await assertCoachInClub(data.coachId, clubId);
    const training = await prisma.trainingSession.create({
      data: {
        ...(data.id ? { id: data.id } : {}),
        clubId,
        title: data.title,
        description: data.description,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        coachId: data.coachId,
        capacity: data.capacity,
        registrationDeadline: data.registrationDeadline
          ? new Date(data.registrationDeadline)
          : new Date(data.date),
        goals: data.goals,
        whatToBring: data.whatToBring,
        status: 'open',
      },
      include: withRegistrations,
    });
    res.status(201).json(serializeTraining(training));
  }),
);

trainingsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const existing = await prisma.trainingSession.findFirst({
      where: { id: req.params.id, clubId },
    });
    if (!existing) throw new HttpError(404, 'Treniruotė nerasta');

    const patch = updateTrainingSchema.parse(req.body);
    const { id: _ignoredId, date, registrationDeadline, coachId, ...rest } = patch;
    if (coachId) await assertCoachInClub(coachId, clubId);

    const training = await prisma.trainingSession.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(coachId !== undefined ? { coachId } : {}),
        ...(date !== undefined ? { date: new Date(date) } : {}),
        ...(registrationDeadline !== undefined
          ? { registrationDeadline: new Date(registrationDeadline) }
          : {}),
      },
      include: withRegistrations,
    });
    res.json(serializeTraining(training));
  }),
);

trainingsRouter.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const src = await prisma.trainingSession.findFirst({
      where: { id: req.params.id, clubId },
    });
    if (!src) throw new HttpError(404, 'Treniruotė nerasta');
    const copy = await prisma.trainingSession.create({
      data: {
        clubId,
        title: src.title + ' (kopija)',
        description: src.description,
        date: src.date,
        startTime: src.startTime,
        endTime: src.endTime,
        location: src.location,
        coachId: src.coachId,
        capacity: src.capacity,
        registrationDeadline: src.registrationDeadline,
        goals: src.goals,
        whatToBring: src.whatToBring,
        status: 'open',
      },
      include: withRegistrations,
    });
    res.status(201).json(serializeTraining(copy));
  }),
);

trainingsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const existing = await prisma.trainingSession.findFirst({
      where: { id: req.params.id, clubId },
    });
    if (!existing) throw new HttpError(404, 'Treniruotė nerasta');
    await prisma.trainingSession.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

// --- Registrations (business rules moved from the FE store) ---

const registerSchema = z.object({ memberId: z.string() });

trainingsRouter.post(
  '/:id/registrations',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const { memberId } = registerSchema.parse(req.body);
    const trainingId = req.params.id;

    const [training, member] = await Promise.all([
      prisma.trainingSession.findFirst({
        where: { id: trainingId, clubId },
        include: withRegistrations,
      }),
      prisma.member.findFirst({
        where: { id: memberId, clubId },
        include: { membershipPlan: true },
      }),
    ]);

    if (!training || !member) throw new HttpError(404, 'Nerasta');
    if (training.status !== 'open') {
      throw new HttpError(409, 'Registracija į šią treniruotę uždaryta.');
    }
    if (member.paymentStatus === 'overdue') {
      throw new HttpError(409, 'Narystės mokėjimas vėluoja.');
    }
    if (training.registrations.some((r) => r.memberId === memberId)) {
      throw new HttpError(409, 'Jau užsiregistravote.');
    }
    if (training.registrations.length >= training.capacity) {
      throw new HttpError(409, 'Ši treniruotė užpildyta.');
    }

    // Weekly cap enforcement — count all non-cancelled registrations for this
    // member in the ISO week of the target training's date. `null` on the plan
    // means unlimited.
    const cap = member.membershipPlan?.trainingsPerWeek ?? null;
    if (cap !== null) {
      const { start, end } = isoWeekRange(training.date);
      const takenThisWeek = await prisma.trainingRegistration.count({
        where: {
          memberId,
          status: { not: 'cancelled' },
          session: {
            clubId,
            date: { gte: start, lt: end },
          },
        },
      });
      if (takenThisWeek >= cap) {
        throw new HttpError(
          409,
          `Viršijote savaitės limitą (${cap} treniruotės). Pabandykite kitą savaitę arba rinkitės didesnį planą.`,
        );
      }
    }

    await prisma.trainingRegistration.create({
      data: { trainingSessionId: trainingId, memberId },
    });

    const updated = await prisma.trainingSession.findUnique({
      where: { id: trainingId },
      include: withRegistrations,
    });
    res.status(201).json(serializeTraining(updated!));
  }),
);

trainingsRouter.delete(
  '/:id/registrations/:memberId',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const { id: trainingId, memberId } = req.params;

    const training = await prisma.trainingSession.findFirst({
      where: { id: trainingId, clubId },
    });
    if (!training) throw new HttpError(404, 'Treniruotė nerasta');

    await prisma.trainingRegistration.deleteMany({
      where: { trainingSessionId: trainingId, memberId },
    });
    const updated = await prisma.trainingSession.findUnique({
      where: { id: trainingId },
      include: withRegistrations,
    });
    if (!updated) throw new HttpError(404, 'Treniruotė nerasta');
    res.json(serializeTraining(updated));
  }),
);
