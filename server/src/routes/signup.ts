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

const MONTHLY_FEE = 0.5;

// Creates the club + admin user + Stripe customer + subscription. The
// subscription is created with `payment_behavior: default_incomplete` so no
// charge fires until the browser confirms the PaymentIntent. Returns the
// PaymentIntent client_secret to the browser. Card data never touches us.
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
        // No free trial — charge immediately. `default_incomplete` returns an
        // Invoice with a PaymentIntent we confirm on the client via Stripe
        // Elements, so we get 3DS/SCA handled properly.
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: { clubId: club.id },
      });
      subscriptionId = subscription.id;

      const invoice = subscription.latest_invoice as
        | (Stripe.Invoice & { payment_intent: Stripe.PaymentIntent | string | null })
        | null;
      const pi =
        invoice && typeof invoice.payment_intent === 'object'
          ? invoice.payment_intent
          : null;
      const clientSecret = pi?.client_secret;
      if (!clientSecret) {
        throw new Error('Stripe did not return a PaymentIntent client_secret.');
      }

      const periodEndSec =
        subscription.items.data[0]?.current_period_end ??
        Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const periodEnd = new Date(periodEndSec * 1000);

      // 3. Persist the subscription reference. Insert as `active` optimistically —
      //    the client is about to confirm the PaymentIntent. If that fails, the
      //    invoice.payment_failed webhook flips status to past_due.
      await prisma.clubSubscription.create({
        data: {
          clubId: club.id,
          status: 'active',
          monthlyFee: MONTHLY_FEE,
          currency: 'EUR',
          trialEndsAt: periodEnd,
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
          status: 'active' as const,
          monthlyFee: MONTHLY_FEE,
          currency: 'EUR',
          trialEndsAt: periodEnd.toISOString(),
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
