import { Router } from 'express';
import type Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { hashPassword } from '../auth/password.js';
import { getStripe, STRIPE_PRICE_ID } from '../stripe.js';

export const signupRouter = Router();

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
  while (await prisma.club.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

const signupSchema = z.object({
  clubName: z.string().min(2, 'Nurodykite klubo pavadinimą.'),
  adminName: z.string().min(2, 'Nurodykite vardą ir pavardę.'),
  adminEmail: z.string().email('Neteisingas el. paštas.'),
  adminPassword: z.string().min(6, 'Slaptažodis turi būti bent 6 simbolių.'),
});

const MONTHLY_FEE = 100;
const TRIAL_DAYS = 30;

// Creates the club + admin user + Stripe customer + subscription with a
// 14-day free trial. `payment_behavior: default_incomplete` + a trial period
// makes Stripe issue a SetupIntent instead of a PaymentIntent — the browser
// uses it to attach the card without charging. First charge fires when the
// trial ends. Card data never touches us.
signupRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = signupSchema.parse(req.body);
    const email = data.adminEmail.toLowerCase();

    const priceId = STRIPE_PRICE_ID();
    if (!priceId) {
      throw new HttpError(
        500,
        'Stripe kaina nenustatyta. Administratorius turi nurodyti STRIPE_PRICE_ID.',
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new HttpError(409, 'Vartotojas su tokiu el. paštu jau egzistuoja.');
    }

    const slug = await uniqueSlug(slugify(data.clubName));
    const passwordHash = await hashPassword(data.adminPassword);

    // 1. Create the club + admin user first so we have an id to attach to the
    //    Stripe customer metadata.
    const club = await prisma.club.create({
      data: {
        name: data.clubName,
        slug,
        users: {
          create: {
            email,
            passwordHash,
            role: 'admin',
            name: data.adminName,
          },
        },
      },
      include: { users: true },
    });

    // 2. Create the Stripe customer + subscription.
    const stripe = getStripe();
    let customerId: string | null = null;
    let subscriptionId: string | null = null;
    try {
      const customer = await stripe.customers.create({
        email,
        name: data.adminName,
        metadata: { clubId: club.id, clubSlug: club.slug },
      });
      customerId = customer.id;

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        trial_period_days: TRIAL_DAYS,
        // Combined with a trial, `default_incomplete` creates a
        // `pending_setup_intent` (no invoice yet, no charge). Client confirms
        // the SetupIntent to attach the card; Stripe charges when the trial
        // ends.
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
          // Restrict Payment Element to cards only. Without this Stripe
          // auto-enables everything eligible (Klarna, Satispay, iDEAL, etc.),
          // which is confusing for a monthly SaaS subscription.
          payment_method_types: ['card'],
        },
        // If the trial ends without a valid payment method, cancel instead of
        // silently going past_due.
        trial_settings: {
          end_behavior: { missing_payment_method: 'cancel' },
        },
        expand: ['pending_setup_intent'],
        metadata: { clubId: club.id },
      });
      subscriptionId = subscription.id;

      const setupIntent =
        subscription.pending_setup_intent as Stripe.SetupIntent | null;
      const clientSecret = setupIntent?.client_secret ?? null;
      if (!clientSecret) {
        throw new Error(
          'Stripe did not return a pending_setup_intent. Confirm the Price is recurring monthly and trial_period_days is set.',
        );
      }

      const trialEndSec =
        subscription.trial_end ??
        Math.floor(Date.now() / 1000) + TRIAL_DAYS * 24 * 60 * 60;
      const trialEnd = new Date(trialEndSec * 1000);
      const periodEndSec =
        subscription.items.data[0]?.current_period_end ?? trialEndSec;
      const periodEnd = new Date(periodEndSec * 1000);

      // 3. Persist the subscription reference. During the trial the status
      //    is `trialing` — webhooks flip to active/past_due later.
      await prisma.clubSubscription.create({
        data: {
          clubId: club.id,
          status: 'active',
          monthlyFee: MONTHLY_FEE,
          currency: 'EUR',
          trialEndsAt: trialEnd,
          currentPeriodEnd: periodEnd,
          stripeCustomerId: customer.id,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          billingEmail: email,
        },
      });

      res.status(201).json({
        club: { id: club.id, name: club.name, slug: club.slug },
        admin: { email, name: data.adminName },
        subscription: {
          status: 'trialing' as const,
          monthlyFee: MONTHLY_FEE,
          currency: 'EUR',
          trialEndsAt: trialEnd.toISOString(),
          stripeSubscriptionId: subscription.id,
        },
        clientSecret,
        loginUrl: '/login',
      });
    } catch (err) {
      // Roll back everything we created so the user can retry cleanly.
      // Prisma cascade deletes the user; Stripe needs manual cleanup.
      await prisma.club.delete({ where: { id: club.id } }).catch(() => {});
      if (subscriptionId) {
        await stripe.subscriptions.cancel(subscriptionId).catch(() => {});
      }
      if (customerId) {
        await stripe.customers.del(customerId).catch(() => {});
      }
      throw err;
    }
  }),
);
