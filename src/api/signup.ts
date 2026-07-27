import { api } from './client';

export type SignupInput = {
  clubName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

export type SignupResult = {
  club: { id: string; name: string; slug: string };
  admin: { email: string; name: string };
  subscription: {
    status: 'trialing' | 'active' | 'past_due' | 'cancelled';
    monthlyFee: number;
    currency: string;
    trialEndsAt: string;
    stripeSubscriptionId: string;
  };
  // SetupIntent client_secret — pass to stripe.confirmSetup() on the client to
  // attach the payment method and activate the trial.
  clientSecret: string;
  loginUrl: string;
};

export const signupApi = (input: SignupInput) =>
  api.post<SignupResult>('/signup', input);
