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
