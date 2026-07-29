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

// One Stripe.js instance per connected account (member->club Connect flows).
// Cached so the Elements iframe isn't torn down on parent re-renders.
const connectedStripeCache = new Map<string, Promise<Stripe | null>>();
export function getConnectedStripe(
  stripeAccount: string,
): Promise<Stripe | null> | null {
  if (!publishableKey) return null;
  const cached = connectedStripeCache.get(stripeAccount);
  if (cached) return cached;
  const p = loadStripe(publishableKey, { stripeAccount });
  connectedStripeCache.set(stripeAccount, p);
  return p;
}
