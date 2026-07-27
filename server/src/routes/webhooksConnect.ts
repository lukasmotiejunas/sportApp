import express, { Router } from 'express';
import type Stripe from 'stripe';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  getStripe,
  STRIPE_CONNECT_WEBHOOK_SECRET,
} from '../stripe.js';
import { syncClubPlans } from './membershipPlans.js';

export const webhooksConnectRouter = Router();

// Sync a connected-account subscription's Stripe status back onto the Member
// row. Called by the invoice.paid / invoice.payment_failed / subscription.*
// events on the connected account.
async function applySubscriptionStatus(
  sub: Stripe.Subscription,
): Promise<void> {
  const item = sub.items?.data?.[0];
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;

  const paid = sub.status === 'active' || sub.status === 'trialing';
  const overdue =
    sub.status === 'past_due' ||
    sub.status === 'unpaid' ||
    sub.status === 'incomplete_expired';

  await prisma.member.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: {
      ...(paid ? { paymentStatus: 'paid' as const } : {}),
      ...(overdue ? { paymentStatus: 'overdue' as const } : {}),
      ...(periodEnd ? { paymentDueDate: periodEnd } : {}),
      ...(paid ? { lastPaymentDate: new Date() } : {}),
    },
  });
}

// Raw body is required for signature verification. Mount BEFORE any global
// body parser in app.ts.
webhooksConnectRouter.post(
  '/stripe/connect',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const stripe = getStripe();
    const secret = STRIPE_CONNECT_WEBHOOK_SECRET();
    if (!secret) {
      res
        .status(500)
        .json({ error: 'STRIPE_CONNECT_WEBHOOK_SECRET not configured.' });
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

    // `event.account` is set on connected-account events. If it's missing,
    // this webhook shouldn't have been called — safe to ignore.
    const accountId = event.account;
    if (!accountId) {
      res.json({ received: true, note: 'no account on event' });
      return;
    }

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const ready = !!(account.charges_enabled && account.payouts_enabled);
        const club = await prisma.club.findUnique({
          where: { stripeConnectAccountId: accountId },
        });
        if (club) {
          await prisma.club.update({
            where: { id: club.id },
            data: { stripeAccountReady: ready },
          });
          // First time we see ready=true, backfill Stripe Prices for every
          // plan so members can subscribe immediately.
          if (ready) {
            await syncClubPlans(club.id);
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        await applySubscriptionStatus(event.data.object as Stripe.Subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.member.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            paymentStatus: 'pending',
            stripeSubscriptionId: null,
          },
        });
        break;
      }

      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice;
        const subId =
          'subscription' in inv && typeof inv.subscription === 'string'
            ? inv.subscription
            : null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId, undefined, {
            stripeAccount: accountId,
          });
          await applySubscriptionStatus(sub);
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
          await prisma.member.updateMany({
            where: { stripeSubscriptionId: subId },
            data: { paymentStatus: 'overdue' },
          });
        }
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  }),
);
