import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { getStripe } from '../stripe.js';
import { serializeMember } from '../serialize.js';

export const meRouter = Router();

type NormalizedStatus = 'paid' | 'overdue' | 'pending';

// GET /me/billing — real Stripe billing data for the logged-in member.
// Also reconciles the Member row when Stripe's state has moved on but our
// webhook didn't fire (dev, misconfigured endpoint, etc.).
meRouter.get(
  '/billing',
  asyncHandler(async (req, res) => {
    if (!req.user?.memberId) {
      throw new HttpError(403, 'Šis endpointas prieinamas tik nariams.');
    }

    const member = await prisma.member.findUnique({
      where: { id: req.user.memberId },
      include: { club: { select: { stripeConnectAccountId: true } } },
    });
    if (!member) throw new HttpError(404, 'Narys nerastas.');

    const stripeAccount = member.club.stripeConnectAccountId;
    const subId = member.stripeSubscriptionId;
    const custId = member.stripeCustomerId;

    // No Stripe link -> manually managed member. Return what we have from DB.
    if (!stripeAccount || !subId || !custId) {
      res.json({
        hasSubscription: false,
        status: member.paymentStatus as NormalizedStatus,
        subscriptionStatus: null,
        currentPeriodEnd:
          member.paymentDueDate?.toISOString().slice(0, 10) ?? null,
        cancelAtPeriodEnd: false,
        upcomingInvoice: null,
        invoices: [],
        defaultPaymentMethod: null,
        member: serializeMember(member),
      });
      return;
    }

    const stripe = getStripe();

    const [subscription, invoicesResp] = await Promise.all([
      stripe.subscriptions.retrieve(
        subId,
        { expand: ['default_payment_method'] },
        { stripeAccount },
      ),
      stripe.invoices.list(
        { customer: custId, limit: 24 },
        { stripeAccount },
      ),
    ]);

    // Reconcile paymentStatus / paymentDueDate / lastPaymentDate with Stripe.
    const paid =
      subscription.status === 'active' || subscription.status === 'trialing';
    const overdue =
      subscription.status === 'past_due' ||
      subscription.status === 'unpaid' ||
      subscription.status === 'incomplete_expired';
    const nextStatus: NormalizedStatus = paid
      ? 'paid'
      : overdue
        ? 'overdue'
        : 'pending';

    const item = subscription.items?.data?.[0];
    const periodEnd = item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : null;

    const mostRecentPaid = invoicesResp.data.find(
      (i) => i.status === 'paid' && i.status_transitions?.paid_at,
    );
    const lastPaidAt = mostRecentPaid?.status_transitions?.paid_at
      ? new Date(mostRecentPaid.status_transitions.paid_at * 1000)
      : null;

    const updates: {
      paymentStatus?: NormalizedStatus;
      paymentDueDate?: Date;
      lastPaymentDate?: Date;
    } = {};
    if (member.paymentStatus !== nextStatus) updates.paymentStatus = nextStatus;
    if (
      periodEnd &&
      (!member.paymentDueDate ||
        Math.abs(member.paymentDueDate.getTime() - periodEnd.getTime()) > 1000)
    ) {
      updates.paymentDueDate = periodEnd;
    }
    if (
      lastPaidAt &&
      (!member.lastPaymentDate ||
        Math.abs(member.lastPaymentDate.getTime() - lastPaidAt.getTime()) >
          1000)
    ) {
      updates.lastPaymentDate = lastPaidAt;
    }

    let updatedMember = member;
    if (Object.keys(updates).length > 0) {
      updatedMember = await prisma.member.update({
        where: { id: member.id },
        data: updates,
        include: { club: { select: { stripeConnectAccountId: true } } },
      });
    }

    // Upcoming invoice (may 404 for cancelled/expired subs — swallow).
    let upcomingInvoice: {
      amount: number;
      currency: string;
      dueDate: string | null;
    } | null = null;
    try {
      const upcoming = await stripe.invoices.createPreview(
        { customer: custId, subscription: subId },
        { stripeAccount },
      );
      upcomingInvoice = {
        amount: (upcoming.amount_due ?? 0) / 100,
        currency: upcoming.currency,
        dueDate: upcoming.period_end
          ? new Date(upcoming.period_end * 1000).toISOString().slice(0, 10)
          : null,
      };
    } catch {
      // no upcoming invoice available
    }

    const pmRaw = (subscription as { default_payment_method?: unknown })
      .default_payment_method;
    let defaultPaymentMethod: { brand: string; last4: string } | null = null;
    if (
      pmRaw &&
      typeof pmRaw === 'object' &&
      'card' in pmRaw &&
      (pmRaw as { card?: { brand?: string; last4?: string } }).card?.last4
    ) {
      const card = (pmRaw as { card: { brand: string; last4: string } }).card;
      defaultPaymentMethod = { brand: card.brand, last4: card.last4 };
    }

    res.json({
      hasSubscription: true,
      status: nextStatus,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: periodEnd
        ? periodEnd.toISOString().slice(0, 10)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      upcomingInvoice,
      invoices: invoicesResp.data.map((inv) => ({
        id: inv.id,
        number: inv.number ?? null,
        amount: ((inv.amount_paid || inv.amount_due) as number) / 100,
        currency: inv.currency,
        status: inv.status ?? 'draft',
        paidAt: inv.status_transitions?.paid_at
          ? new Date(inv.status_transitions.paid_at * 1000)
              .toISOString()
              .slice(0, 10)
          : null,
        createdDate: new Date(inv.created * 1000).toISOString().slice(0, 10),
        hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
        invoicePdf: inv.invoice_pdf ?? null,
        periodStart: inv.period_start
          ? new Date(inv.period_start * 1000).toISOString().slice(0, 10)
          : null,
        periodEnd: inv.period_end
          ? new Date(inv.period_end * 1000).toISOString().slice(0, 10)
          : null,
      })),
      defaultPaymentMethod,
      member: serializeMember(updatedMember),
    });
  }),
);

const cancelBody = z.object({ immediately: z.boolean().optional() }).optional();

// POST /me/subscription/cancel — mark the member's subscription to end at the
// current period. They keep access until the paid period ends; Stripe fires
// `customer.subscription.deleted` after that, which our webhook flips to
// `overdue` so the training-registration endpoint blocks them.
meRouter.post(
  '/subscription/cancel',
  asyncHandler(async (req, res) => {
    if (!req.user?.memberId) {
      throw new HttpError(403, 'Šis endpointas prieinamas tik nariams.');
    }
    cancelBody.parse(req.body);

    const member = await prisma.member.findUnique({
      where: { id: req.user.memberId },
      include: { club: { select: { stripeConnectAccountId: true } } },
    });
    if (!member) throw new HttpError(404, 'Narys nerastas.');
    if (!member.stripeSubscriptionId || !member.club.stripeConnectAccountId) {
      throw new HttpError(400, 'Aktyvi Stripe prenumerata nerasta.');
    }

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.update(
      member.stripeSubscriptionId,
      { cancel_at_period_end: true },
      { stripeAccount: member.club.stripeConnectAccountId },
    );

    const item = subscription.items?.data?.[0];
    const periodEnd = item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : null;

    res.json({
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: periodEnd ? periodEnd.toISOString().slice(0, 10) : null,
      subscriptionStatus: subscription.status,
    });
  }),
);

// POST /me/subscription/resume — undo a scheduled cancellation. Only valid
// while the subscription is still active (cancel_at_period_end=true but the
// period hasn't ended yet); Stripe rejects the call once the sub is deleted.
meRouter.post(
  '/subscription/resume',
  asyncHandler(async (req, res) => {
    if (!req.user?.memberId) {
      throw new HttpError(403, 'Šis endpointas prieinamas tik nariams.');
    }

    const member = await prisma.member.findUnique({
      where: { id: req.user.memberId },
      include: { club: { select: { stripeConnectAccountId: true } } },
    });
    if (!member) throw new HttpError(404, 'Narys nerastas.');
    if (!member.stripeSubscriptionId || !member.club.stripeConnectAccountId) {
      throw new HttpError(400, 'Aktyvi Stripe prenumerata nerasta.');
    }

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.update(
      member.stripeSubscriptionId,
      { cancel_at_period_end: false },
      { stripeAccount: member.club.stripeConnectAccountId },
    );

    const item = subscription.items?.data?.[0];
    const periodEnd = item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : null;

    res.json({
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: periodEnd ? periodEnd.toISOString().slice(0, 10) : null,
      subscriptionStatus: subscription.status,
    });
  }),
);
