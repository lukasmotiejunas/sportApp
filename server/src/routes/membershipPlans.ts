import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireRole } from '../middleware/auth.js';
import { serializeMembershipPlan } from '../serialize.js';

export const membershipPlansRouter = Router();

membershipPlansRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const plans = await prisma.membershipPlan.findMany({ orderBy: { monthlyFee: 'asc' } });
    res.json(plans.map(serializeMembershipPlan));
  }),
);

const createPlanSchema = z.object({
  name: z.string().min(1),
  monthlyFee: z.number().nonnegative(),
  currency: z.string().min(1).max(8).optional(),
});

// Admin-only: create a membership plan.
membershipPlansRouter.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = createPlanSchema.parse(req.body);
    const plan = await prisma.membershipPlan.create({
      data: {
        name: data.name,
        monthlyFee: data.monthlyFee,
        currency: data.currency ?? 'EUR',
      },
    });
    res.status(201).json(serializeMembershipPlan(plan));
  }),
);

// Admin-only: delete a membership plan. Members referencing it have their
// membershipPlanId set to null (optional relation), so this never fails on FK.
membershipPlansRouter.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.membershipPlan.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, 'Narystės planas nerastas.');
    await prisma.membershipPlan.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
