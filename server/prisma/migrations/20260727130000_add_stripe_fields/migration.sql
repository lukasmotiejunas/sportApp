-- Stripe integration: store customer/subscription/price ids for reconciliation.

ALTER TABLE "ClubSubscription"
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "stripePriceId" TEXT;

CREATE UNIQUE INDEX "ClubSubscription_stripeCustomerId_key"
  ON "ClubSubscription"("stripeCustomerId");

CREATE UNIQUE INDEX "ClubSubscription_stripeSubscriptionId_key"
  ON "ClubSubscription"("stripeSubscriptionId");

-- Drop the legacy €150 default since the plan is now driven by Stripe.
ALTER TABLE "ClubSubscription"
  ALTER COLUMN "monthlyFee" SET DEFAULT 0.01;
