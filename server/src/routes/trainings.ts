import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
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

trainingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const trainings = await prisma.trainingSession.findMany({
      include: withRegistrations,
      orderBy: { date: 'asc' },
    });
    res.json(trainings.map(serializeTraining));
  }),
);

trainingsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const training = await prisma.trainingSession.findUnique({
      where: { id: req.params.id },
      include: withRegistrations,
    });
    if (!training) throw new HttpError(404, 'Treniruotė nerasta');
    res.json(serializeTraining(training));
  }),
);

trainingsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = trainingBaseSchema.parse(req.body);
    const training = await prisma.trainingSession.create({
      data: {
        ...(data.id ? { id: data.id } : {}),
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
    const patch = updateTrainingSchema.parse(req.body);
    const { id: _ignoredId, date, registrationDeadline, ...rest } = patch;
    const training = await prisma.trainingSession.update({
      where: { id: req.params.id },
      data: {
        ...rest,
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
    const src = await prisma.trainingSession.findUnique({ where: { id: req.params.id } });
    if (!src) throw new HttpError(404, 'Treniruotė nerasta');
    const copy = await prisma.trainingSession.create({
      data: {
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
    await prisma.trainingSession.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

// --- Registrations (business rules moved from the FE store) ---

const registerSchema = z.object({ memberId: z.string() });

trainingsRouter.post(
  '/:id/registrations',
  asyncHandler(async (req, res) => {
    const { memberId } = registerSchema.parse(req.body);
    const trainingId = req.params.id;

    const [training, member] = await Promise.all([
      prisma.trainingSession.findUnique({
        where: { id: trainingId },
        include: withRegistrations,
      }),
      prisma.member.findUnique({ where: { id: memberId } }),
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
    const { id: trainingId, memberId } = req.params;
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
