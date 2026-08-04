import Stripe from 'stripe';

let cached: Stripe | null = null;

// Lazy initializer — the rest of the app can boot without Stripe env vars.
// Only /signup and /webhooks touch this, and they fail loudly if the key is
// missing at call time.
export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Add it to server/.env before using the signup or webhook routes.',
    );
  }
  cached = new Stripe(key, { apiVersion: '2026-06-24.dahlia' });
  return cached;
}

export const STRIPE_PRICE_ID = () => process.env.STRIPE_PRICE_ID ?? '';
export const STRIPE_WEBHOOK_SECRET = () => process.env.STRIPE_WEBHOOK_SECRET ?? '';

// Connect / marketplace ---------------------------------------------------

// Separate webhook secret for Connect events (member subscriptions on
// connected accounts). Kept distinct from the platform secret so we can be
// sure which context each event belongs to.
export const STRIPE_CONNECT_WEBHOOK_SECRET = () =>
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET ?? '';

// Percentage of every member payment routed to Lumo's platform balance via
// Stripe's `application_fee_percent`. Tunable per-deploy without a code
// change. Default 3.
export const LUMO_APPLICATION_FEE_PERCENT = () => {
  const raw = Number(process.env.LUMO_APPLICATION_FEE_PERCENT ?? 3);
  if (!Number.isFinite(raw) || raw < 0 || raw > 100) return 3;
  return raw;
};
