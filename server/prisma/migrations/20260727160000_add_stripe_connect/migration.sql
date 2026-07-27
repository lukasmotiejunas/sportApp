-- Stripe Connect (Express) support: money flows member → club directly,
-- Lumo takes an application fee. Requires per-club Connect account, per-plan
-- mirrored Stripe Price, per-member Stripe Customer + Subscription.

ALTER TABLE "Club"
  ADD COLUMN "stripeConnectAccountId" TEXT,
  ADD COLUMN "stripeAccountReady" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Club_stripeConnectAccountId_key"
  ON "Club"("stripeConnectAccountId");

ALTER TABLE "MembershipPlan"
  ADD COLUMN "stripeProductId" TEXT,
  ADD COLUMN "stripePriceId" TEXT;

ALTER TABLE "Member"
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT;

CREATE UNIQUE INDEX "Member_stripeCustomerId_key"
  ON "Member"("stripeCustomerId");
CREATE UNIQUE INDEX "Member_stripeSubscriptionId_key"
  ON "Member"("stripeSubscriptionId");
