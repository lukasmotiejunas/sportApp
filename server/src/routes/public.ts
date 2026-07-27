import { Router } from 'express';
import type Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { hashPassword } from '../auth/password.js';
import { initialsFromName, randomAvatarColor } from '../util.js';
import { serializeMember, serializeMembershipPlan } from '../serialize.js';
import { getStripe, LUMO_APPLICATION_FEE_PERCENT } from '../stripe.js';

export const publicRouter = Router();

// GET /clubs/:slug — public club info + membership plans, used to render the
// join page (no auth). 404 if club doesn't exist or subscription is suspended.
publicRouter.get(
  '/clubs/:slug',
  asyncHandler(async (req, res) => {
    const club = await prisma.club.findUnique({
      where: { slug: req.params.slug },
      include: {
        subscription: { select: { status: true } },
        membershipPlans: { orderBy: { monthlyFee: 'asc' } },
      },
    });
    if (!club) throw new HttpError(404, 'Klubas nerastas.');

    const status = club.subscription?.status;
    if (status === 'past_due' || status === 'cancelled') {
      throw new HttpError(
        403,
        'Šis klubas šiuo metu nepriima naujų narių. Susisiekite su klubo administratoriumi.',
      );
    }

    res.json({
      id: club.id,
      name: club.name,
      slug: club.slug,
      logoUrl: club.logoUrl ?? null,
      plans: club.membershipPlans.map(serializeMembershipPlan),
    });
  }),
);

const joinSchema = z.object({
  name: z.string().min(2, 'Nurodykite vardą ir pavardę.').max(120),
  email: z.string().email('Neteisingas el. paštas.'),
  password: z.string().min(6, 'Slaptažodis turi būti bent 6 simbolių.'),
  phone: z.string().max(40).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'unspecified']).optional(),
  membershipPlanId: z.string().optional(),
});

// POST /clubs/:slug/members — public member registration into an existing
// club. Same effect as an admin using "Pridėti narį", but the member chooses
// their own credentials + plan.
publicRouter.post(
  '/clubs/:slug/members',
  asyncHandler(async (req, res) => {
    const club = await prisma.club.findUnique({
      where: { slug: req.params.slug },
      include: { subscription: { select: { status: true } } },
    });
    if (!club) throw new HttpError(404, 'Klubas nerastas.');
    const status = club.subscription?.status;
    if (status === 'past_due' || status === 'cancelled') {
      throw new HttpError(
        403,
        'Šis klubas šiuo metu nepriima naujų narių. Susisiekite su klubo administratoriumi.',
      );
    }

    const data = joinSchema.parse(req.body);
    const email = data.email.toLowerCase();

    const [existingUser, existingMember] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.member.findUnique({ where: { email } }),
    ]);
    if (existingUser || existingMember) {
      throw new HttpError(409, 'Vartotojas su tokiu el. paštu jau egzistuoja.');
    }

    let planForStripe:
      | { id: string; stripePriceId: string | null; monthlyFee: number }
      | null = null;
    if (data.membershipPlanId) {
      const plan = await prisma.membershipPlan.findFirst({
        where: { id: data.membershipPlanId, clubId: club.id },
      });
      if (!plan) {
        throw new HttpError(400, 'Pasirinktas planas nepriskirtas šiam klubui.');
      }
      planForStripe = {
        id: plan.id,
        stripePriceId: plan.stripePriceId,
        monthlyFee: Number(plan.monthlyFee),
      };
    }

    const passwordHash = await hashPassword(data.password);

    const member = await prisma.member.create({
      data: {
        clubId: club.id,
        name: data.name,
        email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender ?? 'unspecified',
        membershipPlanId: data.membershipPlanId || null,
        initials: initialsFromName(data.name),
        avatarColor: randomAvatarColor(),
        paymentStatus: 'pending',
        user: {
          create: {
            email,
            passwordHash,
            role: 'member',
            name: data.name,
            clubId: club.id,
          },
        },
      },
    });

    // If the club has a verified Connect account AND the chosen plan is
    // synced to Stripe AND the fee is > 0, create a Customer + incomplete
    // Subscription on the connected account. The client finishes payment via
    // Stripe Elements against that connected account.
    let clientSecret: string | null = null;
    let paymentRequired = false;
    if (
      club.stripeAccountReady &&
      club.stripeConnectAccountId &&
      planForStripe?.stripePriceId &&
      planForStripe.monthlyFee > 0
    ) {
      paymentRequired = true;
      const stripe = getStripe();
      const acct = club.stripeConnectAccountId;
      try {
        const customer = await stripe.customers.create(
          {
            email,
            name: data.name,
            metadata: { memberId: member.id, clubId: club.id },
          },
          { stripeAccount: acct },
        );
        const subscription = await stripe.subscriptions.create(
          {
            customer: customer.id,
            items: [{ price: planForStripe.stripePriceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: {
              save_default_payment_method: 'on_subscription',
              payment_method_types: ['card'],
            },
            application_fee_percent: LUMO_APPLICATION_FEE_PERCENT(),
            expand: ['latest_invoice.confirmation_secret'],
            metadata: { memberId: member.id, clubId: club.id },
          },
          { stripeAccount: acct },
        );
        const invoice = subscription.latest_invoice as Stripe.Invoice | null;
        clientSecret = invoice?.confirmation_secret?.client_secret ?? null;

        await prisma.member.update({
          where: { id: member.id },
          data: {
            stripeCustomerId: customer.id,
            stripeSubscriptionId: subscription.id,
          },
        });
      } catch (err) {
        // Do NOT undo the member — admin can still see them as pending. Log
        // and return without a client secret so the frontend shows the "no
        // payment yet" success path.
        // eslint-disable-next-line no-console
        console.error('Stripe subscription create failed:', err);
        clientSecret = null;
        paymentRequired = false;
      }
    }

    res.status(201).json({
      member: serializeMember(member),
      club: {
        id: club.id,
        name: club.name,
        slug: club.slug,
        stripeConnectAccountId: club.stripeConnectAccountId,
      },
      paymentRequired,
      clientSecret,
      loginUrl: '/login',
    });
  }),
);
