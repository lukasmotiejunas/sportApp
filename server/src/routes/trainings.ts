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
  // Legacy fields — kept accepted for backwards compatibility, no longer
  // shown in the UI. Payloads from new clients will omit them entirely.
  goals: z.array(z.string()).optional().default([]),
  whatToBring: z.array(z.string()).optional().default([]),
  // Shared plan copied to every registered member's TrainingPlan on register.
  defaultPlan: z.string().optional().default(''),
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
        defaultPlan: data.defaultPlan || null,
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

    const planType = member.membershipPlan?.planType ?? 'monthly';

    if (planType === 'credits') {
      // Credit plans: block if the member has no credits left. Also block
      // members whose plan was never paid for (creditsRemaining is null and
      // the plan has a fee).
      const balance = member.creditsRemaining ?? 0;
      if (balance <= 0) {
        throw new HttpError(
          409,
          'Nebeturite treniruočių kreditų. Papildykite planą, kad galėtumėte registruotis.',
        );
      }
    } else {
      // Monthly plan — enforce weekly cap. Count non-cancelled registrations
      // this ISO week. `null` on the plan means unlimited.
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
    }

    await prisma.trainingRegistration.create({
      data: { trainingSessionId: trainingId, memberId },
    });

    // Deduct one credit on successful registration.
    if (planType === 'credits') {
      await prisma.member.update({
        where: { id: memberId },
        data: { creditsRemaining: { decrement: 1 } },
      });
    }

    // Seed a per-member TrainingPlan from the session's shared plan. Skip if
    // one already exists for this (member, session) — a coach may have created
    // it earlier. Published so the member sees it immediately.
    if (training.defaultPlan && training.defaultPlan.trim().length > 0) {
      const existingPlan = await prisma.trainingPlan.findFirst({
        where: { trainingSessionId: trainingId, memberId },
      });
      if (!existingPlan) {
        await prisma.trainingPlan.create({
          data: {
            memberId,
            trainingSessionId: trainingId,
            title: training.title,
            planBody: training.defaultPlan,
            status: 'published',
          },
        });
      }
    }

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

    // Once the session has started, cancelling doesn't help anyone — block it
    // so members can't retroactively free up their spot / claim a credit back.
    // Admins / coaches acting on someone else's behalf are covered by this too.
    // Same-day comparison uses the training's date + start time.
    if (req.user?.role === 'member') {
      const startAt = new Date(
        `${training.date.toISOString().slice(0, 10)}T${training.startTime}:00`,
      );
      if (startAt.getTime() <= Date.now()) {
        throw new HttpError(
          409,
          'Treniruotė jau prasidėjo — registracijos atšaukti nebegalima.',
        );
      }
    }

    // Deleting a real registration means we should also refund the credit
    // (only for credit-plan members). Do this in a transaction so we don't
    // double-refund.
    const removed = await prisma.trainingRegistration.deleteMany({
      where: { trainingSessionId: trainingId, memberId },
    });
    if (removed.count > 0) {
      const member = await prisma.member.findFirst({
        where: { id: memberId, clubId },
        include: { membershipPlan: true },
      });
      if (member?.membershipPlan?.planType === 'credits') {
        await prisma.member.update({
          where: { id: memberId },
          data: { creditsRemaining: { increment: 1 } },
        });
      }
    }

    const updated = await prisma.trainingSession.findUnique({
      where: { id: trainingId },
      include: withRegistrations,
    });
    if (!updated) throw new HttpError(404, 'Treniruotė nerasta');
    res.json(serializeTraining(updated));
  }),
);
