import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireClubId, requireRole } from '../middleware/auth.js';
import { serializeMembershipPlan } from '../serialize.js';
import { getStripe } from '../stripe.js';

export const membershipPlansRouter = Router();

// Creates a Stripe Product + recurring monthly Price on the club's connected
// account and persists the ids on the plan row. No-op if the club isn't
// Connect-ready yet — the plan is synced later by `syncClubPlans`.
async function ensureStripePriceForPlan(planId: string): Promise<void> {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    include: { club: true },
  });
  if (!plan) return;
  if (plan.stripePriceId) return;
  const acct = plan.club.stripeConnectAccountId;
  if (!plan.club.stripeAccountReady || !acct) return;
  if (Number(plan.monthlyFee) <= 0) return;

  const stripe = getStripe();
  const product = await stripe.products.create(
    { name: plan.name, metadata: { planId: plan.id } },
    { stripeAccount: acct },
  );
  const price = await stripe.prices.create(
    {
      product: product.id,
      unit_amount: Math.round(Number(plan.monthlyFee) * 100),
      currency: plan.currency.toLowerCase(),
      recurring: { interval: 'month' },
    },
    { stripeAccount: acct },
  );
  await prisma.membershipPlan.update({
    where: { id: plan.id },
    data: { stripeProductId: product.id, stripePriceId: price.id },
  });
}

// Called from the Connect webhook when a club first flips to ready — creates
// Stripe Prices for every plan that doesn't have one yet.
export async function syncClubPlans(clubId: string): Promise<void> {
  const plans = await prisma.membershipPlan.findMany({
    where: { clubId, stripePriceId: null },
    select: { id: true },
  });
  for (const p of plans) {
    await ensureStripePriceForPlan(p.id).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`Failed to sync plan ${p.id}:`, err);
    });
  }
}

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

    // Best-effort mirror to Stripe. If the club isn't connect-ready yet, this
    // is a no-op — the sync will happen on account.updated webhook.
    await ensureStripePriceForPlan(plan.id).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`Failed to create Stripe Price for plan ${plan.id}:`, err);
    });

    const refreshed = await prisma.membershipPlan.findUnique({
      where: { id: plan.id },
    });
    res.status(201).json(serializeMembershipPlan(refreshed!));
  }),
);

// Admin-only: manually resync any plans that don't have a Stripe Price yet.
membershipPlansRouter.post(
  '/sync',
  requireRole('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    await syncClubPlans(clubId);
    const plans = await prisma.membershipPlan.findMany({
      where: { clubId },
      orderBy: { monthlyFee: 'asc' },
    });
    res.json(plans.map(serializeMembershipPlan));
  }),
);

// Admin-only: delete a membership plan. Members referencing it have their
// membershipPlanId set to null (optional relation), so this never fails on FK.
// Stripe Price is deactivated (not deleted) so any historic subscriptions
// keep working; hard-deleting a Price with active subs breaks them.
membershipPlansRouter.delete(
  '/:id',
  requireRole('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const existing = await prisma.membershipPlan.findFirst({
      where: { id: req.params.id, clubId },
      include: { club: true },
    });
    if (!existing) throw new HttpError(404, 'Narystės planas nerastas.');

    if (existing.stripePriceId && existing.club.stripeConnectAccountId) {
      await getStripe()
        .prices.update(
          existing.stripePriceId,
          { active: false },
          { stripeAccount: existing.club.stripeConnectAccountId },
        )
        .catch(() => {});
    }

    await prisma.membershipPlan.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
