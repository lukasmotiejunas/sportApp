import { Router } from 'express';
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

// Creates the club + admin user + Stripe customer + trialing subscription.
// Returns the SetupIntent client_secret so the browser can confirm the card
// via Stripe Elements. Card data never touches our server.
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
        trial_period_days: 1,
        // `default_incomplete` returns a pending_setup_intent we finish on the
        // client. Without it, Stripe would try to charge the (nonexistent)
        // payment method immediately and 400.
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['pending_setup_intent'],
        metadata: { clubId: club.id },
      });
      subscriptionId = subscription.id;

      const setupIntent = subscription.pending_setup_intent as
        | { client_secret: string | null }
        | null;
      const clientSecret = setupIntent?.client_secret;
      if (!clientSecret) {
        throw new Error('Stripe did not return a SetupIntent client_secret.');
      }

      const trialEndsAt = subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);

      // 3. Persist the subscription reference. Card details are populated
      //    later by the setup_intent.succeeded webhook.
      await prisma.clubSubscription.create({
        data: {
          clubId: club.id,
          status: 'trialing',
          monthlyFee: 0.01,
          currency: 'EUR',
          trialEndsAt,
          currentPeriodEnd: trialEndsAt,
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
          monthlyFee: 0.01,
          currency: 'EUR',
          trialEndsAt: trialEndsAt.toISOString(),
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
