import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
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

trainingPlansRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const memberId = typeof req.query.memberId === 'string' ? req.query.memberId : undefined;
    const plans = await prisma.trainingPlan.findMany({
      where: memberId ? { memberId } : undefined,
    });
    res.json(plans.map(serializeTrainingPlan));
  }),
);

// Upsert (create or update) keyed on the FE-provided id.
trainingPlansRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    const data = upsertPlanSchema.parse(req.body);
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
    await prisma.trainingPlan.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
