import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireClubId } from '../middleware/auth.js';
import { serializeTrainingPlan } from '../serialize.js';

export const trainingPlansRouter = Router();

const upsertPlanSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  trainingSessionId: z.string().optional().default(''),
  title: z.string(),
  duration: z.number().int().nonnegative().optional().default(0),
  coachNote: z.string().optional().default(''),
  plan: z.string().optional().default(''),
  status: z.enum(['draft', 'published']).optional().default('draft'),
});

// TrainingPlan has no clubId column — it lives under a Member (and optionally
// a TrainingSession), which do. We scope through the member relation.
trainingPlansRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const memberId = typeof req.query.memberId === 'string' ? req.query.memberId : undefined;
    const plans = await prisma.trainingPlan.findMany({
      where: {
        member: { clubId },
        ...(memberId ? { memberId } : {}),
      },
    });
    res.json(plans.map(serializeTrainingPlan));
  }),
);

// Upsert (create or update) keyed on the FE-provided id.
trainingPlansRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const data = upsertPlanSchema.parse(req.body);

    // Member must belong to this club.
    const member = await prisma.member.findFirst({
      where: { id: data.memberId, clubId },
    });
    if (!member) throw new HttpError(400, 'Narys nepriklauso šiam klubui.');

    if (data.trainingSessionId) {
      const session = await prisma.trainingSession.findFirst({
        where: { id: data.trainingSessionId, clubId },
      });
      if (!session) throw new HttpError(400, 'Treniruotė nepriklauso šiam klubui.');
    }

    const common = {
      memberId: data.memberId,
      trainingSessionId: data.trainingSessionId || null,
      title: data.title,
      durationMinutes: data.duration,
      coachNote: data.coachNote,
      planBody: data.plan,
      status: data.status,
    };
    const plan = await prisma.trainingPlan.upsert({
      where: { id: data.id },
      create: { id: data.id, ...common },
      update: common,
    });
    res.json(serializeTrainingPlan(plan));
  }),
);

trainingPlansRouter.patch(
  '/:id/publish',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const existing = await prisma.trainingPlan.findFirst({
      where: { id: req.params.id, member: { clubId } },
    });
    if (!existing) throw new HttpError(404, 'Planas nerastas');

    const plan = await prisma.trainingPlan.update({
      where: { id: req.params.id },
      data: { status: 'published' },
    });
    res.json(serializeTrainingPlan(plan));
  }),
);

trainingPlansRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const existing = await prisma.trainingPlan.findFirst({
      where: { id: req.params.id, member: { clubId } },
    });
    if (!existing) throw new HttpError(404, 'Planas nerastas');

    await prisma.trainingPlan.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
