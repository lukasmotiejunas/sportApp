import express, { Router } from 'express';
import type Stripe from 'stripe';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getStripe, STRIPE_WEBHOOK_SECRET } from '../stripe.js';

export const webhooksRouter = Router();

// Map Stripe subscription statuses onto our SubscriptionStatus enum.
function mapStatus(s: Stripe.Subscription.Status) {
  switch (s) {
    case 'trialing':
      return 'trialing' as const;
    case 'active':
      return 'active' as const;
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return 'past_due' as const;
    case 'canceled':
    case 'paused':
      return 'cancelled' as const;
    default:
      return 'past_due' as const;
  }
}

async function syncSubscription(sub: Stripe.Subscription) {
  const status = mapStatus(sub.status);
  // Stripe expresses periods per subscription item on the new "flexible
  // billing" API — take the first item's period_end as the effective end.
  const item = sub.items?.data?.[0];
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;
  const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;

  await prisma.clubSubscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: {
      status,
      ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
      ...(trialEnd ? { trialEndsAt: trialEnd } : {}),
      cancelledAt: status === 'cancelled' ? new Date() : null,
    },
  });
}

async function syncPaymentMethod(customerId: string, pmId: string) {
  const stripe = getStripe();
  const pm = await stripe.paymentMethods.retrieve(pmId);
  if (!pm.card) return;
  await prisma.clubSubscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      cardBrand: pm.card.brand,
      cardLast4: pm.card.last4,
      cardExpMonth: pm.card.exp_month,
      cardExpYear: pm.card.exp_year,
      cardholderName: pm.billing_details?.name ?? undefined,
    },
  });
}

// Raw body is required for signature verification — do NOT let express.json()
// touch this route. Mount BEFORE any global body parser in app.ts.
webhooksRouter.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const stripe = getStripe();
    const secret = STRIPE_WEBHOOK_SECRET();
    if (!secret) {
      res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET not configured.' });
      return;
    }

    const sig = req.headers['stripe-signature'];
    if (!sig || Array.isArray(sig)) {
      res.status(400).json({ error: 'Missing Stripe-Signature header.' });
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'signature verify failed';
      res.status(400).json({ error: `Webhook Error: ${msg}` });
      return;
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case 'setup_intent.succeeded': {
        const si = event.data.object as Stripe.SetupIntent;
        const customerId =
          typeof si.customer === 'string' ? si.customer : si.customer?.id;
        const pmId =
          typeof si.payment_method === 'string'
            ? si.payment_method
            : si.payment_method?.id;
        if (customerId && pmId) {
          await syncPaymentMethod(customerId, pmId);
        }
        break;
      }
      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice;
        const subId =
          'subscription' in inv && typeof inv.subscription === 'string'
            ? inv.subscription
            : null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(sub);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        const subId =
          'subscription' in inv && typeof inv.subscription === 'string'
            ? inv.subscription
            : null;
        if (subId) {
          await prisma.clubSubscription.updateMany({
            where: { stripeSubscriptionId: subId },
            data: { status: 'past_due' },
          });
        }
        break;
      }
      default:
        // Ignore other events — Stripe fires a lot of them.
        break;
    }

    res.json({ received: true });
  }),
);
