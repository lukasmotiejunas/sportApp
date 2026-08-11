import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { getStripe, LUMO_APPLICATION_FEE_PERCENT } from '../stripe.js';
import { serializeMember } from '../serialize.js';
import { getClubAdminInfo } from '../util.js';
import { sendPaymentEmail } from '../email.js';

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

    let member = await prisma.member.findUnique({
      where: { id: req.user.memberId },
      include: {
        club: { select: { stripeConnectAccountId: true } },
        membershipPlan: true,
      },
    });
    if (!member) throw new HttpError(404, 'Narys nerastas.');

    const stripeAccount = member.club.stripeConnectAccountId;
    const subId = member.stripeSubscriptionId;
    const custId = member.stripeCustomerId;

    const stripe = getStripe();

    // Credit-plan reconciliation + payment-history collection. We fetch the
    // customer's PaymentIntents once and use the result for both:
    //   (a) crediting any succeeded PIs whose webhook we missed
    //   (b) building an invoice-like list for the member's payment history
    let creditIntents: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      created: string;
      description: string | null;
    }> = [];
    if (
      member.membershipPlan?.planType === 'credits' &&
      stripeAccount &&
      custId
    ) {
      const list = await stripe.paymentIntents
        .list({ customer: custId, limit: 20 }, { stripeAccount })
        .catch(() => null);
      if (list) {
        let addTotal = 0;
        const claimed: string[] = [];
        let switchTo: string | null = null;
        for (const pi of list.data) {
          if (pi.metadata?.planType !== 'credits') continue;
          if (pi.metadata?.memberId !== member.id) continue;
          const n = Number(pi.metadata?.creditCount);
          if (pi.status === 'succeeded') {
            if (
              pi.metadata?.credited !== 'true' &&
              Number.isFinite(n) &&
              n > 0
            ) {
              addTotal += Math.floor(n);
              claimed.push(pi.id);
              // Latest unclaimed switchTo wins (PIs are returned newest-first).
              if (
                !switchTo &&
                typeof pi.metadata?.switchToPlanId === 'string' &&
                pi.metadata.switchToPlanId
              ) {
                switchTo = pi.metadata.switchToPlanId;
              }
            }
          }
          // Track for payment history regardless of claim state.
          if (
            pi.status === 'succeeded' ||
            pi.status === 'processing' ||
            pi.status === 'requires_action' ||
            pi.status === 'canceled'
          ) {
            creditIntents.push({
              id: pi.id,
              amount: (pi.amount ?? 0) / 100,
              currency: pi.currency,
              status: pi.status,
              created: new Date(pi.created * 1000).toISOString().slice(0, 10),
              description: Number.isFinite(n) && n > 0 ? `${n} treniruočių paketas` : null,
            });
          }
        }
        if (addTotal > 0) {
          member = await prisma.member.update({
            where: { id: member.id },
            data: {
              creditsRemaining: (member.creditsRemaining ?? 0) + addTotal,
              paymentStatus: 'paid',
              lastPaymentDate: new Date(),
              ...(switchTo && switchTo !== member.membershipPlanId
                ? { membershipPlanId: switchTo }
                : {}),
            },
            include: {
              club: { select: { stripeConnectAccountId: true } },
              membershipPlan: true,
            },
          });
          // Stamp each PI as claimed so we can never double-credit.
          for (const id of claimed) {
            await stripe.paymentIntents
              .update(
                id,
                { metadata: { credited: 'true' } },
                { stripeAccount },
              )
              .catch(() => {});
          }

          // Notify club admin of the payment (fires once per reconciliation
          // batch — PIs are already stamped credited above so this won't repeat).
          const totalAmountCents = claimed.reduce((sum, id) => {
            const pi = list!.data.find((p) => p.id === id);
            return sum + (pi?.amount ?? 0);
          }, 0);
          const adminInfo = await getClubAdminInfo(member.clubId);
          if (adminInfo?.club.notifyPayment && totalAmountCents > 0) {
            await sendPaymentEmail(
              adminInfo.adminEmail,
              member.name,
              totalAmountCents,
              'eur',
              adminInfo.club.name,
            ).catch((err) => {
              console.error('[notify] sendPaymentEmail (billing reconcile) failed:', err);
            });
          }
        }
      }
    }

    // No Stripe subscription -> credit-plan or manually managed member. Return
    // what we have (possibly just-reconciled above).
    if (!stripeAccount || !subId || !custId) {
      res.json({
        hasSubscription: false,
        status: member.paymentStatus as NormalizedStatus,
        subscriptionStatus: null,
        currentPeriodEnd:
          member.paymentDueDate?.toISOString().slice(0, 10) ?? null,
        cancelAtPeriodEnd: false,
        upcomingInvoice: null,
        // Credit-plan PaymentIntents rendered as invoice-like entries so the
        // "Mokėjimų istorija" section can show them.
        invoices: creditIntents.map((pi) => ({
          id: pi.id,
          number: pi.description,
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status === 'succeeded' ? 'paid' : pi.status,
          paidAt: pi.status === 'succeeded' ? pi.created : null,
          createdDate: pi.created,
          hostedInvoiceUrl: null,
          invoicePdf: null,
          periodStart: null,
          periodEnd: null,
        })),
        defaultPaymentMethod: null,
        member: serializeMember(member),
      });
      return;
    }

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
        include: {
          club: { select: { stripeConnectAccountId: true } },
          membershipPlan: true,
        },
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

const purchaseCreditsSchema = z
  .object({ membershipPlanId: z.string().min(1).optional() })
  .optional();

// POST /me/credits/purchase — buy a credit pack. If `membershipPlanId` is
// omitted, tops up the member's current plan. If provided, lets them switch
// to a different credit plan (metadata.switchToPlanId flips membershipPlanId
// on successful payment). Creates a one-time PaymentIntent on the club's
// connected account; the webhook grants credits on payment_intent.succeeded.
meRouter.post(
  '/credits/purchase',
  asyncHandler(async (req, res) => {
    if (!req.user?.memberId) {
      throw new HttpError(403, 'Šis endpointas prieinamas tik nariams.');
    }
    const body = purchaseCreditsSchema.parse(req.body) ?? {};
    const member = await prisma.member.findUnique({
      where: { id: req.user.memberId },
      include: {
        club: {
          select: { stripeConnectAccountId: true, stripeAccountReady: true },
        },
        membershipPlan: true,
      },
    });
    if (!member) throw new HttpError(404, 'Narys nerastas.');
    if (!member.club.stripeAccountReady || !member.club.stripeConnectAccountId) {
      throw new HttpError(400, 'Klubas dar nepriima mokėjimų.');
    }

    // Pick the target plan: explicit choice, or fall back to member's current.
    let targetPlan = member.membershipPlan;
    if (body.membershipPlanId) {
      targetPlan = await prisma.membershipPlan.findFirst({
        where: { id: body.membershipPlanId, clubId: member.clubId },
      });
      if (!targetPlan) throw new HttpError(404, 'Planas nerastas.');
    }
    if (!targetPlan) {
      throw new HttpError(400, 'Priskirto plano nėra.');
    }
    if (targetPlan.planType !== 'credits') {
      throw new HttpError(400, 'Šis planas nėra kreditų paketas.');
    }
    const price = Number(targetPlan.monthlyFee);
    if (!Number.isFinite(price) || price <= 0) {
      throw new HttpError(400, 'Plano kaina netinkama.');
    }
    const credits = targetPlan.creditCount ?? 0;
    if (credits <= 0) {
      throw new HttpError(400, 'Plane nenurodytas kreditų kiekis.');
    }

    const stripe = getStripe();
    const acct = member.club.stripeConnectAccountId;

    // Reuse the existing Stripe Customer if we have one; otherwise create.
    let customerId = member.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: member.email,
          name: member.name,
          metadata: { memberId: member.id, clubId: member.clubId },
        },
        { stripeAccount: acct },
      );
      customerId = customer.id;
      await prisma.member.update({
        where: { id: member.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    const applicationFee = Math.round(
      (price * 100 * LUMO_APPLICATION_FEE_PERCENT()) / 100,
    );
    const intent = await stripe.paymentIntents.create(
      {
        customer: customerId,
        amount: Math.round(price * 100),
        currency: 'eur',
        payment_method_types: ['card'],
        application_fee_amount: applicationFee,
        metadata: {
          memberId: member.id,
          clubId: member.clubId,
          planId: targetPlan.id,
          planType: 'credits',
          creditCount: String(credits),
          // Set only when the member picked a plan different from their
          // current one; webhook/reconciliation reads this to flip
          // membershipPlanId on success.
          switchToPlanId: targetPlan.id,
        },
      },
      { stripeAccount: acct },
    );

    res.json({
      clientSecret: intent.client_secret,
      stripeAccount: acct,
      amount: price,
      creditCount: credits,
    });
  }),
);

// POST /me/subscribe — start a Stripe subscription for a monthly plan.
// Used when a credit-plan member wants to switch to recurring, or an unpaid
// member wants to pick a plan for the first time. Returns clientSecret to
// confirm the initial invoice via Stripe Elements.
const subscribeSchema = z.object({ membershipPlanId: z.string().min(1) });
meRouter.post(
  '/subscribe',
  asyncHandler(async (req, res) => {
    if (!req.user?.memberId) {
      throw new HttpError(403, 'Šis endpointas prieinamas tik nariams.');
    }
    const { membershipPlanId } = subscribeSchema.parse(req.body);

    const member = await prisma.member.findUnique({
      where: { id: req.user.memberId },
      include: {
        club: {
          select: { stripeConnectAccountId: true, stripeAccountReady: true },
        },
      },
    });
    if (!member) throw new HttpError(404, 'Narys nerastas.');
    if (!member.club.stripeAccountReady || !member.club.stripeConnectAccountId) {
      throw new HttpError(400, 'Klubas dar nepriima mokėjimų.');
    }
    const plan = await prisma.membershipPlan.findFirst({
      where: { id: membershipPlanId, clubId: member.clubId },
    });
    if (!plan) throw new HttpError(404, 'Planas nerastas.');
    if (plan.planType !== 'monthly') {
      throw new HttpError(400, 'Šis endpointas skirtas tik mėnesiniams planams.');
    }
    if (!plan.stripePriceId) {
      throw new HttpError(400, 'Planas dar nesinchronizuotas su Stripe.');
    }

    const stripe = getStripe();
    const acct = member.club.stripeConnectAccountId;

    // Reuse existing Stripe Customer if we have one; otherwise create.
    let customerId = member.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: member.email,
          name: member.name,
          metadata: { memberId: member.id, clubId: member.clubId },
        },
        { stripeAccount: acct },
      );
      customerId = customer.id;
    }

    // If the member has an existing subscription (e.g. was on a monthly plan
    // already), cancel it first so we don't stack two subscriptions.
    if (member.stripeSubscriptionId) {
      await stripe.subscriptions
        .cancel(member.stripeSubscriptionId, undefined, { stripeAccount: acct })
        .catch(() => {});
    }

    const subscription = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: plan.stripePriceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card'],
        },
        application_fee_percent: LUMO_APPLICATION_FEE_PERCENT(),
        expand: ['latest_invoice.confirmation_secret'],
        metadata: {
          memberId: member.id,
          clubId: member.clubId,
          planId: plan.id,
        },
      },
      { stripeAccount: acct },
    );
    const invoice = subscription.latest_invoice as
      | { confirmation_secret?: { client_secret?: string } }
      | null;
    const clientSecret = invoice?.confirmation_secret?.client_secret ?? null;
    if (!clientSecret) {
      throw new HttpError(
        500,
        'Nepavyko paruošti mokėjimo — patikrinkite Stripe konfigūraciją.',
      );
    }

    // Optimistic DB update: set the new plan and subscription. Webhook flips
    // paymentStatus to `paid` after the card is confirmed. Credits are wiped
    // since the member is no longer on a credit plan.
    await prisma.member.update({
      where: { id: member.id },
      data: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        membershipPlanId: plan.id,
        creditsRemaining: null,
      },
    });

    res.json({
      clientSecret,
      stripeAccount: acct,
      amount: Number(plan.monthlyFee),
      planName: plan.name,
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
