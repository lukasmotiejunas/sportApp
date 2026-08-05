import { Router } from 'express';
import { z } from 'zod';
import type Stripe from 'stripe';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireRole } from '../middleware/auth.js';
import { hashPassword } from '../auth/password.js';
import { serializeClub, serializeUser } from '../serialize.js';
import { signToken } from '../auth/jwt.js';
import { getStripe } from '../stripe.js';

export const superAdminRouter = Router();

// All routes here require super_admin.
superAdminRouter.use(requireRole('super_admin'));

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'club';

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 1;
  // Loop until we find a slug not already used.
  while (await prisma.club.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

// Platform earnings = every application fee we've collected across all
// connected accounts, net of refunds. Fetched by scanning `applicationFees`
// on the platform Stripe account. Returns cents. Falls back to a zeroed
// result if Stripe is not configured or the request fails, so the dashboard
// still loads.
async function fetchPlatformEarnings(): Promise<{
  total: number;
  byAccount: Map<string, number>;
}> {
  const byAccount = new Map<string, number>();
  let total = 0;
  try {
    const stripe = getStripe();
    for await (const fee of stripe.applicationFees.list({ limit: 100 })) {
      const net = (fee.amount ?? 0) - (fee.amount_refunded ?? 0);
      total += net;
      const acc =
        typeof fee.account === 'string' ? fee.account : fee.account?.id;
      if (acc) byAccount.set(acc, (byAccount.get(acc) ?? 0) + net);
    }
  } catch (err) {
    console.warn('fetchPlatformEarnings failed:', err);
  }
  return { total, byAccount };
}

// Aggregated stats across all clubs.
superAdminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [clubCount, memberCount, coachCount, earnings] = await Promise.all([
      prisma.club.count(),
      prisma.member.count(),
      prisma.coach.count(),
      fetchPlatformEarnings(),
    ]);

    res.json({
      clubs: clubCount,
      members: memberCount,
      coaches: coachCount,
      platformEarnings: earnings.total / 100,
    });
  }),
);

// List every club with headline stats.
superAdminRouter.get(
  '/clubs',
  asyncHandler(async (_req, res) => {
    const [clubs, earnings] = await Promise.all([
      prisma.club.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { members: true, coaches: true, users: true } },
        },
      }),
      fetchPlatformEarnings(),
    ]);

    res.json(
      clubs.map((c) => ({
        ...serializeClub(c),
        memberCount: c._count.members,
        coachCount: c._count.coaches,
        userCount: c._count.users,
        platformEarnings: c.stripeConnectAccountId
          ? (earnings.byAccount.get(c.stripeConnectAccountId) ?? 0) / 100
          : 0,
      })),
    );
  }),
);

// Detail view for a single club.
superAdminRouter.get(
  '/clubs/:id',
  asyncHandler(async (req, res) => {
    const club = await prisma.club.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            members: true,
            coaches: true,
            users: true,
            trainingSessions: true,
            membershipPlans: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            paymentStatus: true,
            membershipPlan: { select: { name: true, monthlyFee: true } },
            user: { select: { id: true } },
          },
          orderBy: { name: 'asc' },
        },
        coaches: {
          select: {
            id: true,
            name: true,
            specialty: true,
            user: { select: { id: true } },
          },
          orderBy: { name: 'asc' },
        },
        users: {
          where: { role: 'admin' },
          select: { id: true, email: true, name: true, createdAt: true },
        },
      },
    });
    if (!club) throw new HttpError(404, 'Club not found');

    const earnings = await fetchPlatformEarnings();
    const platformEarnings = club.stripeConnectAccountId
      ? (earnings.byAccount.get(club.stripeConnectAccountId) ?? 0) / 100
      : 0;

    res.json({
      ...serializeClub(club),
      counts: {
        members: club._count.members,
        coaches: club._count.coaches,
        users: club._count.users,
        trainingSessions: club._count.trainingSessions,
        membershipPlans: club._count.membershipPlans,
      },
      platformEarnings,
      admins: club.users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name ?? undefined,
        createdAt: u.createdAt.toISOString(),
      })),
      members: club.members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        paymentStatus: m.paymentStatus,
        planName: m.membershipPlan?.name ?? null,
        monthlyFee: Number(m.membershipPlan?.monthlyFee ?? 0),
        userId: m.user?.id ?? null,
      })),
      coaches: club.coaches.map((c) => ({
        id: c.id,
        name: c.name,
        specialty: c.specialty ?? '',
        userId: c.user?.id ?? null,
      })),
    });
  }),
);

// -------------------------------------------------------------------------
// Finances — live pull from Stripe for member payments (Connect account) and
// the club's own platform subscription. Whole history by default; scope to a
// month via ?month=YYYY-MM. Fees & tax are only in Stripe (no local mirror),
// so this can be slow for large clubs — accept for now, cache later.
// -------------------------------------------------------------------------

type FinancePayment = {
  id: string;
  kind: 'subscription' | 'credits';
  number: string | null;
  memberId: string | null;
  memberName: string | null;
  memberEmail: string | null;
  gross: number;
  stripeFee: number;
  applicationFee: number;
  tax: number;
  net: number;
  currency: string;
  paidAt: string;
  hostedInvoiceUrl: string | null;
};

type FinanceTotals = {
  gross: number;
  stripeFee: number;
  applicationFee: number;
  tax: number;
  net: number;
  count: number;
};

function emptyTotals(): FinanceTotals {
  return { gross: 0, stripeFee: 0, applicationFee: 0, tax: 0, net: 0, count: 0 };
}

function addToTotals(list: FinancePayment[]): FinanceTotals {
  return list.reduce<FinanceTotals>((acc, p) => {
    acc.gross += p.gross;
    acc.stripeFee += p.stripeFee;
    acc.applicationFee += p.applicationFee;
    acc.tax += p.tax;
    acc.net += p.net;
    acc.count += 1;
    return acc;
  }, emptyTotals());
}

function parseMonthRange(m: string | null): { gte: number; lt: number } | null {
  if (!m) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(m);
  if (!match) return null;
  const year = Number(match[1]);
  const mon = Number(match[2]);
  if (mon < 1 || mon > 12) return null;
  const start = Date.UTC(year, mon - 1, 1);
  const end = Date.UTC(year, mon, 1);
  return { gte: Math.floor(start / 1000), lt: Math.floor(end / 1000) };
}

// Tax field moved from `invoice.tax` (int) to `total_taxes[]` in newer API
// versions. Tolerate both.
function invoiceTaxCents(inv: Stripe.Invoice): number {
  const legacy = (inv as unknown as { tax?: number | null }).tax;
  if (typeof legacy === 'number') return legacy;
  const arr = (inv as unknown as { total_taxes?: { amount?: number }[]; total_tax_amounts?: { amount?: number }[] });
  const list = arr.total_taxes ?? arr.total_tax_amounts;
  if (Array.isArray(list)) {
    return list.reduce((s, t) => s + (t?.amount ?? 0), 0);
  }
  return 0;
}

superAdminRouter.get(
  '/clubs/:id/finances',
  asyncHandler(async (req, res) => {
    const club = await prisma.club.findUnique({
      where: { id: req.params.id },
      include: { subscription: true },
    });
    if (!club) throw new HttpError(404, 'Club not found');

    const monthParam = typeof req.query.month === 'string' ? req.query.month : null;
    const range = parseMonthRange(monthParam);
    const createdFilter = range ? { created: { gte: range.gte, lt: range.lt } } : {};

    const stripe = getStripe();

    // -------- Member payments (on the club's Connect account) --------------
    const memberPayments: FinancePayment[] = [];
    let memberCurrency = 'eur';

    if (club.stripeConnectAccountId) {
      const acct = club.stripeConnectAccountId;

      // First pass: build a charge lookup keyed by payment_intent so invoices
      // and one-time PIs can attribute Stripe fees + platform fees.
      const chargeByPi = new Map<
        string,
        { fee: number; net: number; applicationFee: number }
      >();
      for await (const ch of stripe.charges.list(
        { limit: 100, ...createdFilter, expand: ['data.balance_transaction'] },
        { stripeAccount: acct },
      )) {
        const bt = ch.balance_transaction;
        const fee =
          bt && typeof bt !== 'string' && typeof bt.fee === 'number' ? bt.fee : 0;
        const net =
          bt && typeof bt !== 'string' && typeof bt.net === 'number' ? bt.net : ch.amount;
        const piId = typeof ch.payment_intent === 'string' ? ch.payment_intent : null;
        if (!piId) continue;
        const prev = chargeByPi.get(piId) ?? { fee: 0, net: 0, applicationFee: 0 };
        chargeByPi.set(piId, {
          fee: prev.fee + fee,
          net: prev.net + net,
          applicationFee: prev.applicationFee + (ch.application_fee_amount ?? 0),
        });
      }

      const invoicesData: Stripe.Invoice[] = [];
      for await (const inv of stripe.invoices.list(
        { limit: 100, ...createdFilter, expand: ['data.payments'] },
        { stripeAccount: acct },
      )) {
        invoicesData.push(inv);
      }

      const oneTimeIntents: Stripe.PaymentIntent[] = [];
      for await (const pi of stripe.paymentIntents.list(
        { limit: 100, ...createdFilter },
        { stripeAccount: acct },
      )) {
        if (pi.metadata?.planType === 'credits') oneTimeIntents.push(pi);
      }

      // Correlate to members via stripeCustomerId so the UI can name payers.
      const customerIds = new Set<string>();
      for (const inv of invoicesData) {
        if (typeof inv.customer === 'string') customerIds.add(inv.customer);
      }
      for (const pi of oneTimeIntents) {
        if (typeof pi.customer === 'string') customerIds.add(pi.customer);
      }
      const members = customerIds.size
        ? await prisma.member.findMany({
            where: { clubId: club.id, stripeCustomerId: { in: [...customerIds] } },
            select: { id: true, name: true, email: true, stripeCustomerId: true },
          })
        : [];
      const memberByCustomer = new Map(
        members.map((m) => [m.stripeCustomerId!, m]),
      );

      for (const inv of invoicesData) {
        const gross = inv.amount_paid ?? 0;
        if (!gross) continue;
        let stripeFee = 0;
        let applicationFee = 0;
        const payments = inv.payments?.data ?? [];
        for (const p of payments) {
          if (p.status !== 'paid') continue;
          const piRef = p.payment.payment_intent;
          const piId = typeof piRef === 'string' ? piRef : piRef?.id ?? null;
          const data = piId ? chargeByPi.get(piId) : undefined;
          if (data) {
            stripeFee += data.fee;
            applicationFee += data.applicationFee;
          }
        }
        const tax = invoiceTaxCents(inv);
        // balance_transaction.fee on a connected account already includes the
        // application fee. Split them so the UI can report Stripe's cut vs.
        // ours separately, and net = gross − balance_transaction.fee.
        const pureStripeFee = Math.max(0, stripeFee - applicationFee);
        const net = gross - stripeFee;
        memberCurrency = inv.currency;

        const customerId = typeof inv.customer === 'string' ? inv.customer : null;
        const member = customerId ? memberByCustomer.get(customerId) : undefined;

        memberPayments.push({
          id: inv.id,
          kind: 'subscription',
          number: inv.number ?? null,
          memberId: member?.id ?? null,
          memberName: member?.name ?? null,
          memberEmail: member?.email ?? null,
          gross: gross / 100,
          stripeFee: pureStripeFee / 100,
          applicationFee: applicationFee / 100,
          tax: tax / 100,
          net: net / 100,
          currency: inv.currency,
          paidAt: inv.status_transitions?.paid_at
            ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
            : new Date(inv.created * 1000).toISOString(),
          hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
        });
      }

      for (const pi of oneTimeIntents) {
        if (pi.status !== 'succeeded') continue;
        const gross = pi.amount_received || pi.amount || 0;
        if (!gross) continue;
        const data = chargeByPi.get(pi.id) ?? { fee: 0, net: gross, applicationFee: 0 };
        // See note above: data.fee already includes application fee.
        const pureStripeFee = Math.max(0, data.fee - data.applicationFee);
        const net = gross - data.fee;
        memberCurrency = pi.currency;

        const customerId = typeof pi.customer === 'string' ? pi.customer : null;
        const member = customerId ? memberByCustomer.get(customerId) : undefined;
        const creditCount = pi.metadata?.creditCount;

        memberPayments.push({
          id: pi.id,
          kind: 'credits',
          number: creditCount ? `Kreditų paketas · ${creditCount}` : null,
          memberId: member?.id ?? null,
          memberName: member?.name ?? null,
          memberEmail: member?.email ?? null,
          gross: gross / 100,
          stripeFee: pureStripeFee / 100,
          applicationFee: data.applicationFee / 100,
          tax: 0,
          net: net / 100,
          currency: pi.currency,
          paidAt: new Date(pi.created * 1000).toISOString(),
          hostedInvoiceUrl: null,
        });
      }
    }

    memberPayments.sort((a, b) => b.paidAt.localeCompare(a.paidAt));

    // -------- Club's own subscription payments (platform account) ---------
    const clubSubPayments: FinancePayment[] = [];
    let clubSubCurrency = 'eur';

    if (club.subscription?.stripeCustomerId) {
      const customer = club.subscription.stripeCustomerId;

      const chargeByPi = new Map<string, { fee: number; net: number }>();
      for await (const ch of stripe.charges.list({
        customer,
        limit: 100,
        ...createdFilter,
        expand: ['data.balance_transaction'],
      })) {
        const bt = ch.balance_transaction;
        const fee =
          bt && typeof bt !== 'string' && typeof bt.fee === 'number' ? bt.fee : 0;
        const net =
          bt && typeof bt !== 'string' && typeof bt.net === 'number' ? bt.net : ch.amount;
        const piId = typeof ch.payment_intent === 'string' ? ch.payment_intent : null;
        if (!piId) continue;
        const prev = chargeByPi.get(piId) ?? { fee: 0, net: 0 };
        chargeByPi.set(piId, { fee: prev.fee + fee, net: prev.net + net });
      }

      for await (const inv of stripe.invoices.list({
        customer,
        limit: 100,
        ...createdFilter,
        expand: ['data.payments'],
      })) {
        const gross = inv.amount_paid ?? 0;
        if (!gross) continue;
        let stripeFee = 0;
        const payments = inv.payments?.data ?? [];
        for (const p of payments) {
          if (p.status !== 'paid') continue;
          const piRef = p.payment.payment_intent;
          const piId = typeof piRef === 'string' ? piRef : piRef?.id ?? null;
          const data = piId ? chargeByPi.get(piId) : undefined;
          if (data) stripeFee += data.fee;
        }
        const tax = invoiceTaxCents(inv);
        const net = gross - stripeFee;
        clubSubCurrency = inv.currency;

        clubSubPayments.push({
          id: inv.id,
          kind: 'subscription',
          number: inv.number ?? null,
          memberId: null,
          memberName: null,
          memberEmail: null,
          gross: gross / 100,
          stripeFee: stripeFee / 100,
          applicationFee: 0,
          tax: tax / 100,
          net: net / 100,
          currency: inv.currency,
          paidAt: inv.status_transitions?.paid_at
            ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
            : new Date(inv.created * 1000).toISOString(),
          hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
        });
      }
    }
    clubSubPayments.sort((a, b) => b.paidAt.localeCompare(a.paidAt));

    res.json({
      month: monthParam,
      memberPayments: {
        currency: memberCurrency.toUpperCase(),
        totals: addToTotals(memberPayments),
        list: memberPayments,
      },
      clubSubscription: {
        currency: clubSubCurrency.toUpperCase(),
        totals: addToTotals(clubSubPayments),
        list: clubSubPayments,
      },
    });
  }),
);

// -------------------------------------------------------------------------
// Platform-wide finances page. Aggregates every application fee we've
// collected (our cut of member payments) and every paid club-subscription
// invoice (what clubs pay us for SportApp itself), broken out per month.
// Uses the same helpers as /clubs/:id/finances. All values in the platform
// currency (EUR); Stripe returns amounts in cents.
// -------------------------------------------------------------------------
superAdminRouter.get(
  '/finances',
  asyncHandler(async (_req, res) => {
    type MonthAgg = {
      applicationFees: number;
      clubSubscriptions: number;
      stripeFees: number;
      tax: number;
    };
    const monthMap = new Map<string, MonthAgg>();
    const bucket = (m: string): MonthAgg => {
      const cur = monthMap.get(m);
      if (cur) return cur;
      const fresh: MonthAgg = {
        applicationFees: 0,
        clubSubscriptions: 0,
        stripeFees: 0,
        tax: 0,
      };
      monthMap.set(m, fresh);
      return fresh;
    };
    const monthKey = (unixSec: number): string => {
      const d = new Date(unixSec * 1000);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    };

    let appFeesTotal = 0;
    let clubSubTotal = 0;
    let stripeFeesTotal = 0;
    let taxTotal = 0;

    try {
      const stripe = getStripe();

      // Application fees = our platform cut across all Connect accounts.
      for await (const fee of stripe.applicationFees.list({ limit: 100 })) {
        const net = (fee.amount ?? 0) - (fee.amount_refunded ?? 0);
        appFeesTotal += net;
        bucket(monthKey(fee.created)).applicationFees += net;
      }

      // Charge fees indexed by payment_intent, for pairing with invoices.
      const feeByPi = new Map<string, number>();
      for await (const ch of stripe.charges.list({
        limit: 100,
        expand: ['data.balance_transaction'],
      })) {
        const bt = ch.balance_transaction;
        const fee =
          bt && typeof bt !== 'string' && typeof bt.fee === 'number' ? bt.fee : 0;
        const piId = typeof ch.payment_intent === 'string' ? ch.payment_intent : null;
        if (piId) feeByPi.set(piId, (feeByPi.get(piId) ?? 0) + fee);
      }

      // Paid invoices on the platform = club subscription payments to us.
      for await (const inv of stripe.invoices.list({
        limit: 100,
        expand: ['data.payments'],
      })) {
        if (inv.status !== 'paid') continue;
        const gross = inv.amount_paid ?? 0;
        if (!gross) continue;
        const paidAt = inv.status_transitions?.paid_at ?? inv.created;
        const b = bucket(monthKey(paidAt));
        b.clubSubscriptions += gross;
        clubSubTotal += gross;

        let stripeFee = 0;
        for (const p of inv.payments?.data ?? []) {
          if (p.status !== 'paid') continue;
          const piRef = p.payment.payment_intent;
          const piId = typeof piRef === 'string' ? piRef : piRef?.id ?? null;
          const fee = piId ? feeByPi.get(piId) : undefined;
          if (fee) stripeFee += fee;
        }
        b.stripeFees += stripeFee;
        stripeFeesTotal += stripeFee;

        const tax = invoiceTaxCents(inv);
        b.tax += tax;
        taxTotal += tax;
      }
    } catch (err) {
      console.warn('finances aggregation failed:', err);
    }

    const months = [...monthMap.entries()]
      .map(([month, agg]) => ({
        month,
        applicationFees: agg.applicationFees / 100,
        clubSubscriptions: agg.clubSubscriptions / 100,
        stripeFees: agg.stripeFees / 100,
        tax: agg.tax / 100,
        net:
          (agg.applicationFees + agg.clubSubscriptions - agg.stripeFees - agg.tax) /
          100,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    const grossTotal = appFeesTotal + clubSubTotal;
    res.json({
      totals: {
        applicationFees: appFeesTotal / 100,
        clubSubscriptions: clubSubTotal / 100,
        grossTotal: grossTotal / 100,
        stripeFees: stripeFeesTotal / 100,
        tax: taxTotal / 100,
        net: (grossTotal - stripeFeesTotal - taxTotal) / 100,
      },
      months,
    });
  }),
);

// POST /superadmin/impersonate/:userId — mint a JWT for the target user so a
// super_admin can debug issues in that user's shoes. Refuses to impersonate
// another super_admin. The frontend opens the returned session in a new tab
// backed by sessionStorage, so the original super_admin session in the
// current tab stays intact.
superAdminRouter.post(
  '/impersonate/:userId',
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({
      where: { id: req.params.userId },
      include: { club: { include: { subscription: true } } },
    });
    if (!target) throw new HttpError(404, 'Vartotojas nerastas.');
    if (target.role === 'super_admin') {
      throw new HttpError(400, 'Negalima apsimesti kitu super_admin.');
    }

    const token = signToken({
      userId: target.id,
      role: target.role,
      clubId: target.clubId,
      memberId: target.memberId,
      coachId: target.coachId,
    });

    const sub = target.club?.subscription;
    res.json({
      token,
      user: {
        ...serializeUser(target),
        clubLogo: target.club?.logoUrl ?? null,
        subscription: sub
          ? {
              status: sub.status,
              trialEndsAt: sub.trialEndsAt.toISOString(),
              currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
            }
          : null,
      },
    });
  }),
);

const createClubSchema = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
  adminName: z.string().optional(),
});

// Create a new club along with its first admin login.
superAdminRouter.post(
  '/clubs',
  asyncHandler(async (req, res) => {
    const data = createClubSchema.parse(req.body);
    const email = data.adminEmail.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'Vartotojas su tokiu el. paštu jau egzistuoja.');

    const slug = await uniqueSlug(data.slug ? slugify(data.slug) : slugify(data.name));
    const passwordHash = await hashPassword(data.adminPassword);

    const club = await prisma.club.create({
      data: {
        name: data.name,
        slug,
        users: {
          create: {
            email,
            passwordHash,
            role: 'admin',
            name: data.adminName ?? data.name,
          },
        },
      },
      include: { users: true },
    });

    res.status(201).json({
      ...serializeClub(club),
      admin: club.users[0] ? serializeUser(club.users[0]) : null,
    });
  }),
);

// Delete a club and everything under it (cascades via FK).
superAdminRouter.delete(
  '/clubs/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.club.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, 'Club not found');
    await prisma.club.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
