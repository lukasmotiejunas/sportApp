import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireClubId, requireRole } from '../middleware/auth.js';
import { getStripe } from '../stripe.js';

export const connectRouter = Router();

// Admin owns Connect onboarding + status for their club.
connectRouter.use(requireRole('admin'));

// Absolute base URL for Stripe's redirect back to us. Falls back to the
// request origin when APP_URL isn't set (local dev without a domain).
function appBaseUrl(req: { protocol: string; get: (h: string) => string | undefined }): string {
  const fromEnv = process.env.APP_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const host = req.get('host');
  return `${req.protocol}://${host}`;
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
