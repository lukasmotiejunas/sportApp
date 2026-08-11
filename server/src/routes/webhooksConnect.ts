import express, { Router } from 'express';
import type Stripe from 'stripe';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  getStripe,
  STRIPE_CONNECT_WEBHOOK_SECRET,
} from '../stripe.js';
import { syncClubPlans } from './membershipPlans.js';
import { getClubAdminInfo } from '../util.js';
import { sendPaymentEmail } from '../email.js';

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
        // Subscription fully ended (cancelled at period end, or otherwise
        // terminated). Flip to `overdue` so registerForTraining blocks — the
        // paid period is over and no future charge is coming.
        const sub = event.data.object as Stripe.Subscription;
        await prisma.member.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            paymentStatus: 'overdue',
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

          // Notify club admin if enabled.
          const member = await prisma.member.findFirst({ where: { stripeSubscriptionId: subId } });
          if (member) {
            void getClubAdminInfo(member.clubId).then((info) => {
              if (info?.club.notifyPayment) {
                void sendPaymentEmail(info.adminEmail, member.name, inv.amount_paid, inv.currency, info.club.name).catch(() => {});
              }
            });
          }
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

      case 'payment_intent.succeeded': {
        // Credit-pack purchases arrive as one-time PaymentIntents. The public
        // signup route puts memberId + creditCount into metadata; the buy-more
        // endpoint does the same. Add the credits to the member's balance and
        // mark them as paid so training registration is unblocked.
        const pi = event.data.object as Stripe.PaymentIntent;
        const meta = pi.metadata ?? {};
        if (meta.planType !== 'credits' || !meta.memberId) break;
        if (meta.credited === 'true') break; // already applied
        const add = Number(meta.creditCount);
        if (!Number.isFinite(add) || add <= 0) break;

        const member = await prisma.member.findUnique({
          where: { id: meta.memberId },
        });
        if (!member) break;

        // If the purchase was for a *different* credit plan than the member
        // currently has, switch them to it now. Balance is additive across
        // plans (they get their remaining old credits + new pack).
        const switchTo =
          typeof meta.switchToPlanId === 'string' && meta.switchToPlanId
            ? meta.switchToPlanId
            : null;
        await prisma.member.update({
          where: { id: member.id },
          data: {
            creditsRemaining: (member.creditsRemaining ?? 0) + Math.floor(add),
            paymentStatus: 'paid',
            lastPaymentDate: new Date(),
            ...(switchTo && switchTo !== member.membershipPlanId
              ? { membershipPlanId: switchTo }
              : {}),
          },
        });
        // Mark PI as claimed so on-read reconciliation never double-credits.
        await stripe.paymentIntents
          .update(
            pi.id,
            { metadata: { credited: 'true' } },
            { stripeAccount: accountId },
          )
          .catch(() => {});

        // Notify club admin if enabled.
        void getClubAdminInfo(member.clubId).then((info) => {
          if (info?.club.notifyPayment) {
            void sendPaymentEmail(info.adminEmail, member.name, pi.amount, pi.currency, info.club.name).catch(() => {});
          }
        });
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  }),
);
