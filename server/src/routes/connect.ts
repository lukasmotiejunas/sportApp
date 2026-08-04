import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireClubId, requireRole } from '../middleware/auth.js';
import { getStripe, LUMO_APPLICATION_FEE_PERCENT } from '../stripe.js';

export const connectRouter = Router();

// Admin owns Connect onboarding + status for their club.
connectRouter.use(requireRole('admin'));

// Absolute base URL for Stripe's redirect back to us. Falls back to the
// request origin when APP_URL isn't set (local dev without a domain).
// Stripe rejects http:// URLs in live mode, so we force https:// for any
// non-localhost host regardless of what the proxy header says.
function appBaseUrl(req: { protocol: string; get: (h: string) => string | undefined }): string {
  const fromEnv = process.env.APP_URL?.replace(/\/$/, '');
  if (fromEnv) {
    // Tolerate values pasted without a scheme (common mistake in Vercel UI).
    // Stripe rejects anything that isn't http:// or https:// outright.
    if (/^https?:\/\//i.test(fromEnv)) return fromEnv;
    return `https://${fromEnv}`;
  }
  const host = req.get('host') ?? 'localhost:4000';
  const isLocal =
    host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const proto = isLocal ? 'http' : 'https';
  return `${proto}://${host}`;
}

const onboardBody = z.object({}).optional();

// POST /connect/onboard — create a fresh Express account if the club doesn't
// have one yet, then always mint a new Account Link (they expire after ~5min).
connectRouter.post(
  '/onboard',
  asyncHandler(async (req, res) => {
    onboardBody.parse(req.body);
    const clubId = requireClubId(req);
    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw new HttpError(404, 'Klubas nerastas.');

    const stripe = getStripe();

    let accountId = club.stripeConnectAccountId;
    if (!accountId) {
      const admin = await prisma.user.findFirst({
        where: { clubId, role: 'admin' },
        select: { email: true, name: true },
      });
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'LT',
        email: admin?.email ?? undefined,
        business_type: 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: club.name,
          product_description: 'Sporto klubo narystės mokesčiai',
        },
        metadata: { clubId },
      });
      accountId = account.id;
      await prisma.club.update({
        where: { id: clubId },
        data: { stripeConnectAccountId: accountId, stripeAccountReady: false },
      });
    }

    const base = appBaseUrl(req);
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}/admin/subscription?connect=refresh`,
      return_url: `${base}/admin/subscription?connect=done`,
      type: 'account_onboarding',
    });

    res.json({ url: link.url, accountId });
  }),
);

// GET /connect/status — live status from Stripe (cached ready flag is not
// reliable enough for the UI; the source of truth is `accounts.retrieve`).
connectRouter.get(
  '/status',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw new HttpError(404, 'Klubas nerastas.');

    if (!club.stripeConnectAccountId) {
      res.json({
        connected: false,
        ready: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        requirementsDue: [] as string[],
        bankLast4: null,
      });
      return;
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(club.stripeConnectAccountId);

    // Reconcile the cached flag if Stripe now says we're ready and our DB says
    // we're not (webhook may have missed).
    if (account.charges_enabled && !club.stripeAccountReady) {
      await prisma.club.update({
        where: { id: clubId },
        data: { stripeAccountReady: true },
      });
    }

    const externalAcct = account.external_accounts?.data?.[0] as
      | { last4?: string; bank_name?: string }
      | undefined;

    res.json({
      connected: true,
      id: account.id,
      ready: account.charges_enabled && account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirementsDue: account.requirements?.currently_due ?? [],
      bankLast4: externalAcct?.last4 ?? null,
      bankName: externalAcct?.bank_name ?? null,
    });
  }),
);

// POST /connect/dashboard — one-time login link to the Stripe Express
// dashboard (payouts, balance, docs). Only works once the account is verified.
connectRouter.post(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club?.stripeConnectAccountId) {
      throw new HttpError(400, 'Klubas dar neprijungtas prie Stripe.');
    }
    const stripe = getStripe();
    const link = await stripe.accounts.createLoginLink(
      club.stripeConnectAccountId,
    );
    res.json({ url: link.url });
  }),
);

// GET /connect/payments — real Stripe payment history for the club's
// connected account. Returns MTD/lifetime revenue + recent invoices joined to
// our Member rows via `stripeCustomerId` (set at subscription creation time).
connectRouter.get(
  '/payments',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw new HttpError(404, 'Klubas nerastas.');

    if (!club.stripeConnectAccountId) {
      res.json({
        connected: false,
        mtdRevenue: 0,
        mtdCount: 0,
        totalRevenue: 0,
        currency: 'eur',
        invoices: [],
      });
      return;
    }

    const stripe = getStripe();
    const acct = club.stripeConnectAccountId;

    // Fetch a reasonable slice of recent invoices. auto-pagination avoids
    // truncation while keeping the request cheap for typical club sizes.
    const invoices: Array<{
      id: string;
      customerId: string | null;
      memberId: string | null;
      memberName: string | null;
      memberEmail: string | null;
      number: string | null;
      amount: number;
      currency: string;
      status: string;
      paidAt: string | null;
      createdDate: string;
      hostedInvoiceUrl: string | null;
      periodStart: string | null;
      periodEnd: string | null;
    }> = [];

    // Also fetch charges with their balance_transaction expanded so we can
    // report the amount the club actually receives after Stripe processing
    // fees and any platform fees. Charges are correlated to PaymentIntents,
    // and invoices are correlated to PaymentIntents via `invoice.payments`.
    const [rawInvoices, rawIntents, rawCharges] = await Promise.all([
      stripe.invoices.list(
        { limit: 100, expand: ['data.payments'] },
        { stripeAccount: acct },
      ),
      stripe.paymentIntents.list({ limit: 100 }, { stripeAccount: acct }),
      stripe.charges.list(
        { limit: 100, expand: ['data.balance_transaction'] },
        { stripeAccount: acct },
      ),
    ]);

    const netByPaymentIntentId = new Map<string, number>();
    const receiptByPaymentIntentId = new Map<string, string>();
    for (const ch of rawCharges.data) {
      const bt = ch.balance_transaction;
      const net =
        bt && typeof bt !== 'string' && typeof bt.net === 'number'
          ? bt.net
          : null;
      const piId =
        typeof ch.payment_intent === 'string' ? ch.payment_intent : null;
      if (piId && net != null) netByPaymentIntentId.set(piId, net);
      if (piId && ch.receipt_url)
        receiptByPaymentIntentId.set(piId, ch.receipt_url);
    }

    // Invoices in this API version reference their PaymentIntents through the
    // `payments` sub-list rather than a direct `charge` field.
    const netByInvoiceId = new Map<string, number>();
    for (const inv of rawInvoices.data) {
      const payments = inv.payments?.data ?? [];
      for (const p of payments) {
        if (p.status !== 'paid') continue;
        const piRef = p.payment.payment_intent;
        const piId =
          typeof piRef === 'string' ? piRef : piRef?.id ?? null;
        const net = piId ? netByPaymentIntentId.get(piId) : undefined;
        if (net != null) {
          netByInvoiceId.set(
            inv.id,
            (netByInvoiceId.get(inv.id) ?? 0) + net,
          );
        }
      }
    }

    // One-time payments (credit-pack purchases) don't go through Invoices —
    // they're standalone PaymentIntents. Identify them via the metadata we
    // stamp at creation time so we don't double-count subscription charges,
    // which appear both in Invoices and (indirectly) as PaymentIntents.
    const oneTimeIntents = rawIntents.data.filter(
      (pi) => pi.metadata?.planType === 'credits',
    );

    const customerIds = Array.from(
      new Set(
        [
          ...rawInvoices.data.map((i) =>
            typeof i.customer === 'string' ? i.customer : null,
          ),
          ...oneTimeIntents.map((pi) =>
            typeof pi.customer === 'string' ? pi.customer : null,
          ),
        ].filter((v): v is string => !!v),
      ),
    );

    const membersByCustomer =
      customerIds.length > 0
        ? await prisma.member.findMany({
            where: { clubId, stripeCustomerId: { in: customerIds } },
            select: {
              id: true,
              name: true,
              email: true,
              stripeCustomerId: true,
            },
          })
        : [];
    const memberByCustomer = new Map(
      membersByCustomer.map((m) => [m.stripeCustomerId!, m]),
    );

    let mtdRevenueCents = 0;
    let mtdCount = 0;
    let totalRevenueCents = 0;
    let currency = 'eur';
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const inv of rawInvoices.data) {
      const grossPaid = inv.amount_paid ?? 0;
      const netPaid = netByInvoiceId.get(inv.id) ?? grossPaid;
      if (inv.status === 'paid' && grossPaid) {
        totalRevenueCents += netPaid;
        const paidAtTs = inv.status_transitions?.paid_at ?? inv.created;
        if (paidAtTs && new Date(paidAtTs * 1000) >= monthStart) {
          mtdRevenueCents += netPaid;
          mtdCount += 1;
        }
      }
      if (inv.currency) currency = inv.currency;

      const customerId =
        typeof inv.customer === 'string' ? inv.customer : null;
      const linked = customerId ? memberByCustomer.get(customerId) : undefined;

      const displayCents = grossPaid
        ? netPaid
        : (inv.amount_due as number) ?? 0;
      invoices.push({
        id: inv.id,
        customerId,
        memberId: linked?.id ?? null,
        memberName: linked?.name ?? null,
        memberEmail: linked?.email ?? null,
        number: inv.number ?? null,
        amount: displayCents / 100,
        currency: inv.currency,
        status: inv.status ?? 'draft',
        paidAt: inv.status_transitions?.paid_at
          ? new Date(inv.status_transitions.paid_at * 1000)
              .toISOString()
              .slice(0, 10)
          : null,
        createdDate: new Date(inv.created * 1000).toISOString().slice(0, 10),
        hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
        periodStart: inv.period_start
          ? new Date(inv.period_start * 1000).toISOString().slice(0, 10)
          : null,
        periodEnd: inv.period_end
          ? new Date(inv.period_end * 1000).toISOString().slice(0, 10)
          : null,
      });
    }

    for (const pi of oneTimeIntents) {
      const paid = pi.status === 'succeeded';
      const grossCents = pi.amount_received || pi.amount || 0;
      const netCents = netByPaymentIntentId.get(pi.id) ?? grossCents;
      if (paid && grossCents) {
        totalRevenueCents += netCents;
        if (new Date(pi.created * 1000) >= monthStart) {
          mtdRevenueCents += netCents;
          mtdCount += 1;
        }
      }
      if (pi.currency) currency = pi.currency;

      const status =
        pi.status === 'succeeded'
          ? 'paid'
          : pi.status === 'canceled'
            ? 'void'
            : pi.status === 'processing' ||
                pi.status === 'requires_payment_method' ||
                pi.status === 'requires_action' ||
                pi.status === 'requires_capture' ||
                pi.status === 'requires_confirmation'
              ? 'open'
              : 'draft';

      const customerId =
        typeof pi.customer === 'string' ? pi.customer : null;
      const linked = customerId ? memberByCustomer.get(customerId) : undefined;

      const creditCount = pi.metadata?.creditCount;
      const label = creditCount
        ? `Kreditų paketas · ${creditCount}`
        : pi.description || 'Vienkartinis mokėjimas';

      invoices.push({
        id: pi.id,
        customerId,
        memberId: linked?.id ?? null,
        memberName: linked?.name ?? null,
        memberEmail: linked?.email ?? null,
        number: label,
        amount: (paid ? netCents : grossCents) / 100,
        currency: pi.currency,
        status,
        paidAt: paid
          ? new Date(pi.created * 1000).toISOString().slice(0, 10)
          : null,
        createdDate: new Date(pi.created * 1000).toISOString().slice(0, 10),
        hostedInvoiceUrl: receiptByPaymentIntentId.get(pi.id) ?? null,
        periodStart: null,
        periodEnd: null,
      });
    }

    // Sort merged list by date (newest first) so the table stays chronological
    // regardless of whether an entry came from Invoices or PaymentIntents.
    invoices.sort((a, b) => {
      const at = a.paidAt ?? a.createdDate;
      const bt = b.paidAt ?? b.createdDate;
      return bt.localeCompare(at);
    });

    res.json({
      connected: true,
      mtdRevenue: mtdRevenueCents / 100,
      mtdCount,
      totalRevenue: totalRevenueCents / 100,
      currency,
      invoices,
    });
  }),
);

// POST /connect/subscriptions/sync-fee — align every active subscription on
// the club's connected account with the current platform-fee setting. Stripe
// stores `application_fee_percent` on each subscription at creation, so a
// change to the env variable does not retroactively apply to old subs; this
// route sweeps them.
connectRouter.post(
  '/subscriptions/sync-fee',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw new HttpError(404, 'Klubas nerastas.');
    if (!club.stripeConnectAccountId) {
      throw new HttpError(400, 'Klubas dar neprijungtas prie Stripe.');
    }

    const stripe = getStripe();
    const acct = club.stripeConnectAccountId;
    const targetPct = LUMO_APPLICATION_FEE_PERCENT();

    let scanned = 0;
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ id: string; message: string }> = [];

    for await (const sub of stripe.subscriptions.list(
      { status: 'all', limit: 100 },
      { stripeAccount: acct },
    )) {
      scanned += 1;
      // Skip terminal states — Stripe won't accept updates on these anyway.
      if (sub.status === 'canceled' || sub.status === 'incomplete_expired') {
        skipped += 1;
        continue;
      }
      if (sub.application_fee_percent === targetPct) {
        skipped += 1;
        continue;
      }
      try {
        await stripe.subscriptions.update(
          sub.id,
          { application_fee_percent: targetPct },
          { stripeAccount: acct },
        );
        updated += 1;
      } catch (err) {
        errors.push({
          id: sub.id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    res.json({ targetPct, scanned, updated, skipped, errors });
  }),
);
