import { Router } from 'express';
import type Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { hashPassword } from '../auth/password.js';
import { getClubAdminInfo, initialsFromName, randomAvatarColor } from '../util.js';
import { sendNewMemberEmail, sendMeetingConfirmationEmail, sendMeetingNotificationEmail } from '../email.js';
import { serializeMember, serializeMembershipPlan } from '../serialize.js';
import { getStripe, LUMO_APPLICATION_FEE_PERCENT } from '../stripe.js';

const SUPER_ADMIN_EMAIL = 'motiejunas.luk@gmail.com';

// Valid meeting start times: Mon-Fri 08:00-21:00 (1-hour slots, last ends at 22:00)
const VALID_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const h = 8 + i;
  return `${String(h).padStart(2, '0')}:00`;
});

function isWeekday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay();
  return day >= 1 && day <= 5;
}

export const publicRouter = Router();

// GET /meetings/slots?date=YYYY-MM-DD — booked time slots for a given day.
publicRouter.get(
  '/meetings/slots',
  asyncHandler(async (req, res) => {
    const dateStr = String(req.query.date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new HttpError(400, 'Netinkamas datos formatas. Naudokite YYYY-MM-DD.');
    }
    const date = new Date(dateStr + 'T12:00:00Z');
    const meetings = await prisma.meeting.findMany({
      where: { date },
      select: { startTime: true },
    });
    res.json({
      validSlots: VALID_SLOTS,
      bookedSlots: meetings.map((m) => m.startTime),
    });
  }),
);

const bookMeetingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Netinkamas datos formatas.'),
  startTime: z.string(),
  name: z.string().min(2, 'Nurodykite vardą ir pavardę.').max(120),
  email: z.string().email('Neteisingas el. paštas.'),
  inviteEmails: z.array(z.string().email('Neteisingas el. paštas.')).default([]),
});

// POST /meetings — book a meeting slot.
publicRouter.post(
  '/meetings',
  asyncHandler(async (req, res) => {
    const data = bookMeetingSchema.parse(req.body);

    const todayStr = new Date().toISOString().slice(0, 10);
    if (data.date <= todayStr) {
      throw new HttpError(400, 'Susitikimą galima rezervuoti tik nuo rytojaus.');
    }
    if (!isWeekday(data.date)) {
      throw new HttpError(400, 'Susitikimai galimi tik darbo dienomis (Pirmadienį–Penktadienį).');
    }
    if (!VALID_SLOTS.includes(data.startTime)) {
      throw new HttpError(400, 'Netinkamas laikas. Pasirinkite laiką nuo 08:00 iki 21:00.');
    }

    const date = new Date(data.date + 'T12:00:00Z');

    // Check if slot is already taken
    const existing = await prisma.meeting.findUnique({
      where: { date_startTime: { date, startTime: data.startTime } },
    });
    if (existing) {
      throw new HttpError(409, 'Šis laikas jau užimtas. Pasirinkite kitą.');
    }

    await prisma.meeting.create({
      data: {
        date,
        startTime: data.startTime,
        bookedByName: data.name,
        bookedByEmail: data.email,
        inviteEmails: data.inviteEmails,
      },
    });

    // Send emails (non-blocking)
    sendMeetingConfirmationEmail(data.email, data.name, data.date, data.startTime, data.inviteEmails).catch(
      (err) => console.error('[meeting] confirmation email failed:', err),
    );
    sendMeetingNotificationEmail(
      SUPER_ADMIN_EMAIL,
      data.name,
      data.email,
      data.date,
      data.startTime,
      data.inviteEmails,
    ).catch((err) => console.error('[meeting] notification email failed:', err));

    res.status(201).json({ ok: true });
  }),
);

// GET /clubs — public directory of clubs with active subscriptions.
// Returns only trialing/active clubs so cancelled/past_due ones stay hidden.
publicRouter.get(
  '/clubs',
  asyncHandler(async (_req, res) => {
    const clubs = await prisma.club.findMany({
      where: {
        subscription: { status: { in: ['trialing', 'active'] } },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        city: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(clubs);
  }),
);

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
      | {
          id: string;
          stripePriceId: string | null;
          monthlyFee: number;
          planType: 'monthly' | 'credits';
          creditCount: number | null;
        }
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
        planType: plan.planType,
        creditCount: plan.creditCount,
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
    // synced to Stripe AND the fee is > 0, create a Customer + payment on
    // the connected account. Monthly plan → Subscription; credit plan →
    // one-time PaymentIntent.
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

        if (planForStripe.planType === 'credits') {
          // One-time payment for a credit pack. The webhook grants credits on
          // payment_intent.succeeded (see webhooksConnect.ts).
          const applicationFee = Math.round(
            (planForStripe.monthlyFee * 100 * LUMO_APPLICATION_FEE_PERCENT()) /
              100,
          );
          const intent = await stripe.paymentIntents.create(
            {
              customer: customer.id,
              amount: Math.round(planForStripe.monthlyFee * 100),
              currency: 'eur',
              payment_method_types: ['card'],
              application_fee_amount: applicationFee,
              metadata: {
                memberId: member.id,
                clubId: club.id,
                planId: planForStripe.id,
                planType: 'credits',
                creditCount: String(planForStripe.creditCount ?? 0),
              },
            },
            { stripeAccount: acct },
          );
          clientSecret = intent.client_secret ?? null;

          await prisma.member.update({
            where: { id: member.id },
            data: { stripeCustomerId: customer.id },
          });
        } else {
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
        }
      } catch (err) {
        // Do NOT undo the member — admin can still see them as pending. Log
        // and return without a client secret so the frontend shows the "no
        // payment yet" success path.
        // eslint-disable-next-line no-console
        console.error('Stripe payment create failed:', err);
        clientSecret = null;
        paymentRequired = false;
      }
    }

    // Notify club admin of new member registration.
    const adminInfo = await getClubAdminInfo(club.id);
    if (adminInfo?.club.notifyNewMember) {
      await sendNewMemberEmail(adminInfo.adminEmail, data.name, club.name).catch((err) => {
        console.error('[notify] sendNewMemberEmail (public join) failed:', err);
      });
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
