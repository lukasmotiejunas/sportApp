import { loadStripe, type Stripe } from '@stripe/stripe-js';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '';

// loadStripe caches internally but keeping the promise stable across renders
// avoids re-initialising Stripe.js when a component re-mounts.
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripePromise(): Promise<Stripe | null> | null {
  if (!publishableKey) return null;
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

export function hasStripeKey(): boolean {
  return !!publishableKey;
}
