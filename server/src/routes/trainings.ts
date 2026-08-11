import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireClubId } from '../middleware/auth.js';
import { serializeTraining } from '../serialize.js';
import { getClubAdminInfo } from '../util.js';
import { sendNewTrainingEmail } from '../email.js';

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
    // Notify admin before responding — fire-and-forget dies in serverless.
    const adminInfo = await getClubAdminInfo(clubId);
    if (adminInfo?.club.notifyNewTraining) {
      const dateStr = new Date(data.date).toLocaleDateString('lt-LT');
      await sendNewTrainingEmail(adminInfo.adminEmail, data.title, dateStr, adminInfo.club.name).catch((err) => {
        console.error('[notify] sendNewTrainingEmail failed:', err);
      });
    }

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
    // Registered / waitlisted rows both count as "you're already in" here.
    if (
      training.registrations.some(
        (r) =>
          r.memberId === memberId &&
          (r.status === 'registered' || r.status === 'waitlisted'),
      )
    ) {
      throw new HttpError(409, 'Jau užsiregistravote.');
    }

    const activeCount = training.registrations.filter(
      (r) => r.status === 'registered',
    ).length;
    const isFull = activeCount >= training.capacity;

    // Registration cutoff: within 1h of start, joining the waitlist is not
    // allowed. Registering into a free spot is still allowed. Cancellation
    // enforcement is elsewhere in this file.
    if (isFull) {
      const startAt = new Date(
        `${training.date.toISOString().slice(0, 10)}T${training.startTime}:00`,
      );
      const minutesToStart = (startAt.getTime() - Date.now()) / 60000;
      if (minutesToStart < 60) {
        throw new HttpError(
          409,
          'Užpildyta — iki treniruotės liko mažiau nei valanda, į laukiančiųjų sąrašą stoti nebegalima.',
        );
      }
    }

    const planType = member.membershipPlan?.planType ?? 'monthly';

    if (planType === 'credits') {
      // Credit-plan members must have a balance to *register*. For the waitlist
      // we still require credits so we don't stack no-credit members who'd get
      // skipped on promotion; simplest to enforce upfront.
      const balance = member.creditsRemaining ?? 0;
      if (balance <= 0) {
        throw new HttpError(
          409,
          'Nebeturite treniruočių kreditų. Papildykite planą, kad galėtumėte registruotis.',
        );
      }
    } else if (!isFull) {
      // Monthly plan weekly cap — only enforced for actual registration.
      // Waitlist entries don't consume the weekly cap; the cap re-checks at
      // promotion time.
      const cap = member.membershipPlan?.trainingsPerWeek ?? null;
      if (cap !== null) {
        const { start, end } = isoWeekRange(training.date);
        const takenThisWeek = await prisma.trainingRegistration.count({
          where: {
            memberId,
            status: 'registered',
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

    const status = isFull ? 'waitlisted' : 'registered';

    await prisma.trainingRegistration.create({
      data: { trainingSessionId: trainingId, memberId, status },
    });

    if (status === 'registered') {
      // Deduct one credit + seed per-member plan on real registration only.
      if (planType === 'credits') {
        await prisma.member.update({
          where: { id: memberId },
          data: { creditsRemaining: { decrement: 1 } },
        });
      }
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

    // Find the registration first so we know if it was 'registered' or
    // 'waitlisted' before deleting. Only proper registrations trigger
    // promotion + credit refund; leaving the waitlist is always a no-op.
    const existing = await prisma.trainingRegistration.findFirst({
      where: { trainingSessionId: trainingId, memberId },
    });

    // Members can't cancel within an hour of the session start. This applies
    // to 'registered' rows only — waitlist rows can be dropped anytime since
    // they're not attending yet.
    if (
      req.user?.role === 'member' &&
      existing?.status === 'registered'
    ) {
      const startAt = new Date(
        `${training.date.toISOString().slice(0, 10)}T${training.startTime}:00`,
      );
      const minutesToStart = (startAt.getTime() - Date.now()) / 60000;
      if (minutesToStart < 60) {
        throw new HttpError(
          409,
          'Iki treniruotės liko mažiau nei valanda — registracijos atšaukti nebegalima.',
        );
      }
    }

    const removed = await prisma.trainingRegistration.deleteMany({
      where: { trainingSessionId: trainingId, memberId },
    });

    if (removed.count > 0 && existing?.status === 'registered') {
      // Refund the credit for the leaving member.
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

      // Promote the oldest eligible waitlist entry. Loop so if a candidate
      // is out of credits we skip to the next.
      await promoteFromWaitlist(trainingId, clubId);
    }

    const updated = await prisma.trainingSession.findUnique({
      where: { id: trainingId },
      include: withRegistrations,
    });
    if (!updated) throw new HttpError(404, 'Treniruotė nerasta');
    res.json(serializeTraining(updated));
  }),
);

// Promote the oldest eligible waitlisted registration to 'registered'.
// Skips credit-plan members with no credit remaining and tries the next one.
// No-op if no eligible waitlister found.
async function promoteFromWaitlist(
  trainingId: string,
  clubId: string,
): Promise<void> {
  const training = await prisma.trainingSession.findUnique({
    where: { id: trainingId },
  });
  if (!training) return;

  const queue = await prisma.trainingRegistration.findMany({
    where: { trainingSessionId: trainingId, status: 'waitlisted' },
    orderBy: { registeredAt: 'asc' },
  });

  for (const entry of queue) {
    const candidate = await prisma.member.findFirst({
      where: { id: entry.memberId, clubId },
      include: { membershipPlan: true },
    });
    if (!candidate) continue;
    if (candidate.paymentStatus === 'overdue') continue;

    const planType = candidate.membershipPlan?.planType ?? 'monthly';
    if (planType === 'credits' && (candidate.creditsRemaining ?? 0) <= 0) {
      continue;
    }

    // Passed all checks — promote.
    await prisma.trainingRegistration.update({
      where: { id: entry.id },
      data: { status: 'registered' },
    });

    if (planType === 'credits') {
      await prisma.member.update({
        where: { id: candidate.id },
        data: { creditsRemaining: { decrement: 1 } },
      });
    }

    if (training.defaultPlan && training.defaultPlan.trim().length > 0) {
      const existing = await prisma.trainingPlan.findFirst({
        where: { trainingSessionId: trainingId, memberId: candidate.id },
      });
      if (!existing) {
        await prisma.trainingPlan.create({
          data: {
            memberId: candidate.id,
            trainingSessionId: trainingId,
            title: training.title,
            planBody: training.defaultPlan,
            status: 'published',
          },
        });
      }
    }

    return;
  }
}
