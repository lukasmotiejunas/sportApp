import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireClubId, requireRole } from '../middleware/auth.js';
import { serializeMembershipPlan } from '../serialize.js';

export const membershipPlansRouter = Router();

membershipPlansRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const plans = await prisma.membershipPlan.findMany({
      where: { clubId },
      orderBy: { monthlyFee: 'asc' },
    });
    res.json(plans.map(serializeMembershipPlan));
  }),
);

const createPlanSchema = z.object({
  name: z.string().min(1),
  monthlyFee: z.number().nonnegative(),
  currency: z.string().min(1).max(8).optional(),
  // null / undefined = unlimited. 1..10 = weekly cap.
  trainingsPerWeek: z.number().int().min(1).max(10).nullable().optional(),
});

// Admin-only: create a membership plan.
membershipPlansRouter.post(
  '/',
  requireRole('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const data = createPlanSchema.parse(req.body);
    const plan = await prisma.membershipPlan.create({
      data: {
        clubId,
        name: data.name,
        monthlyFee: data.monthlyFee,
        currency: data.currency ?? 'EUR',
        trainingsPerWeek: data.trainingsPerWeek ?? null,
      },
    });
    res.status(201).json(serializeMembershipPlan(plan));
  }),
);

// Admin-only: delete a membership plan. Members referencing it have their
// membershipPlanId set to null (optional relation), so this never fails on FK.
membershipPlansRouter.delete(
  '/:id',
  requireRole('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const existing = await prisma.membershipPlan.findFirst({
      where: { id: req.params.id, clubId },
    });
    if (!existing) throw new HttpError(404, 'Narystės planas nerastas.');
    await prisma.membershipPlan.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
