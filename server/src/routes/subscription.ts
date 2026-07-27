import { Router } from 'express';
import type Stripe from 'stripe';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireRole, requireClubId } from '../middleware/auth.js';
import { getStripe, STRIPE_PRICE_ID } from '../stripe.js';

export const subscriptionRouter = Router();

// Only club admins can manage their club's platform subscription.
subscriptionRouter.use(requireRole('admin'));

async function fetchStripeSubscription(id: string) {
  try {
    return await getStripe().subscriptions.retrieve(id);
  } catch {
    return null;
  }
}

function serializeSubscription(
  db: {
    status: string;
    monthlyFee: unknown;
    currency: string;
    trialEndsAt: Date;
    currentPeriodEnd: Date;
    cancelledAt: Date | null;
    stripeSubscriptionId: string | null;
    cardBrand: string | null;
    cardLast4: string | null;
    cardExpMonth: number | null;
    cardExpYear: number | null;
  },
  stripeSub: Stripe.Subscription | null,
) {
  return {
    status: db.status,
    monthlyFee: Number(db.monthlyFee),
    currency: db.currency,
    trialEndsAt: db.trialEndsAt.toISOString(),
    currentPeriodEnd: db.currentPeriodEnd.toISOString(),
    cancelledAt: db.cancelledAt?.toISOString() ?? null,
    cancelAtPeriodEnd: stripeSub?.cancel_at_period_end ?? false,
    card: db.cardLast4
      ? {
          brand: db.cardBrand,
          last4: db.cardLast4,
          expMonth: db.cardExpMonth,
          expYear: db.cardExpYear,
        }
      : null,
  };
}

// GET / — current subscription state (DB + live Stripe details).
subscriptionRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const sub = await prisma.clubSubscription.findUnique({ where: { clubId } });
    if (!sub) throw new HttpError(404, 'Prenumerata nerasta.');

    const stripeSub = sub.stripeSubscriptionId
      ? await fetchStripeSubscription(sub.stripeSubscriptionId)
      : null;

    res.json(serializeSubscription(sub, stripeSub));
  }),
);

// GET /payments — Stripe invoice history for this club.
subscriptionRouter.get(
  '/payments',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const sub = await prisma.clubSubscription.findUnique({ where: { clubId } });
    if (!sub || !sub.stripeCustomerId) {
      res.json([]);
      return;
    }

    const invoices = await getStripe().invoices.list({
      customer: sub.stripeCustomerId,
      limit: 50,
    });

    res.json(
      invoices.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amount: (inv.amount_paid > 0 ? inv.amount_paid : inv.amount_due) / 100,
        currency: inv.currency.toUpperCase(),
        created: new Date(inv.created * 1000).toISOString(),
        paidAt:
          inv.status === 'paid' && inv.status_transitions?.paid_at
            ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
            : null,
        hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
        invoicePdf: inv.invoice_pdf ?? null,
      })),
    );
  }),
);

// POST /cancel — schedule cancellation at end of current period. If the
// subscription is still in trial, cancel it immediately (no charge yet).
subscriptionRouter.post(
  '/cancel',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const sub = await prisma.clubSubscription.findUnique({ where: { clubId } });
    if (!sub || !sub.stripeSubscriptionId) {
      throw new HttpError(404, 'Prenumerata nerasta.');
    }

    const stripe = getStripe();

    if (sub.status === 'trialing') {
      // Cancel immediately — user hasn't been charged.
      const updated = await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
      await prisma.clubSubscription.update({
        where: { clubId },
        data: { status: 'cancelled', cancelledAt: new Date() },
      });
      res.json(serializeSubscription(
        { ...sub, status: 'cancelled', cancelledAt: new Date() },
        updated,
      ));
      return;
    }

    // Otherwise soft-cancel: they keep access until currentPeriodEnd.
    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    res.json(serializeSubscription(sub, updated));
  }),
);

// POST /resume — undo a scheduled cancellation before period end.
subscriptionRouter.post(
  '/resume',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const sub = await prisma.clubSubscription.findUnique({ where: { clubId } });
    if (!sub || !sub.stripeSubscriptionId) {
      throw new HttpError(404, 'Prenumerata nerasta.');
    }
    const updated = await getStripe().subscriptions.update(
      sub.stripeSubscriptionId,
      { cancel_at_period_end: false },
    );
    res.json(serializeSubscription(sub, updated));
  }),
);

// POST /reactivate — create a fresh subscription after a full cancellation.
// Reuses the existing Stripe customer + default payment method so the admin
// doesn't have to re-enter their card.
subscriptionRouter.post(
  '/reactivate',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const sub = await prisma.clubSubscription.findUnique({ where: { clubId } });
    if (!sub || !sub.stripeCustomerId) {
      throw new HttpError(404, 'Prenumerata nerasta.');
    }
    if (sub.status !== 'cancelled') {
      throw new HttpError(400, 'Prenumerata jau aktyvi.');
    }

    const priceId = STRIPE_PRICE_ID();
    if (!priceId) {
      throw new HttpError(500, 'STRIPE_PRICE_ID nenustatytas.');
    }

    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(sub.stripeCustomerId);
    if (customer.deleted) {
      throw new HttpError(400, 'Klientas Stripe pusėje ištrintas — reikia pilnos naujos registracijos.');
    }

    const defaultPm =
      typeof customer.invoice_settings?.default_payment_method === 'string'
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings?.default_payment_method?.id;

    const newSub = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      // Skip the trial on reactivation — they already had one.
      default_payment_method: defaultPm ?? undefined,
      metadata: { clubId },
    });

    const trialEndsAt = newSub.trial_end
      ? new Date(newSub.trial_end * 1000)
      : new Date();
    const periodEnd = newSub.items.data[0]?.current_period_end
      ? new Date(newSub.items.data[0].current_period_end * 1000)
      : trialEndsAt;

    await prisma.clubSubscription.update({
      where: { clubId },
      data: {
        stripeSubscriptionId: newSub.id,
        stripePriceId: priceId,
        status: newSub.status === 'trialing' ? 'trialing' : 'active',
        trialEndsAt,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
      },
    });

    const refreshed = await prisma.clubSubscription.findUnique({
      where: { clubId },
    });
    res.json(serializeSubscription(refreshed!, newSub));
  }),
);

// DELETE /club — permanently delete the entire club. Only allowed when the
// subscription is fully cancelled; otherwise the admin must cancel first.
// Also removes the Stripe customer (best-effort) to keep records tidy.
subscriptionRouter.delete(
  '/club',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const sub = await prisma.clubSubscription.findUnique({ where: { clubId } });
    if (!sub) throw new HttpError(404, 'Prenumerata nerasta.');
    if (sub.status !== 'cancelled') {
      throw new HttpError(
        400,
        'Klubą galima ištrinti tik atšaukus prenumeratą.',
      );
    }

    if (sub.stripeCustomerId) {
      // Non-fatal — if Stripe cleanup fails we still delete the club so the
      // admin isn't stuck. Orphan Stripe customer is harmless (subscription
      // already cancelled, no future charges).
      await getStripe()
        .customers.del(sub.stripeCustomerId)
        .catch(() => {});
    }

    // Prisma cascade deletes users, members, coaches, trainings, plans,
    // leaderboards, and the subscription row itself.
    await prisma.club.delete({ where: { id: clubId } });

    res.status(204).end();
  }),
);

// GET /pay-invoice-url — hosted invoice URL for the latest unpaid invoice, so
// the admin can retry payment on a past_due subscription.
subscriptionRouter.get(
  '/pay-invoice-url',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const sub = await prisma.clubSubscription.findUnique({ where: { clubId } });
    if (!sub || !sub.stripeCustomerId) {
      throw new HttpError(404, 'Prenumerata nerasta.');
    }
    const invoices = await getStripe().invoices.list({
      customer: sub.stripeCustomerId,
      status: 'open',
      limit: 1,
    });
    const invoice = invoices.data[0];
    if (!invoice) {
      res.json({ url: null });
      return;
    }
    res.json({ url: invoice.hosted_invoice_url ?? null });
  }),
);
