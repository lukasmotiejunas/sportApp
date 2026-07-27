-- Adds a subscription record per club: 14-day free trial then EUR 150/month.

CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'cancelled');

CREATE TABLE "ClubSubscription" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
    "monthlyFee" DECIMAL(10,2) NOT NULL DEFAULT 150.00,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "cardExpMonth" INTEGER,
    "cardExpYear" INTEGER,
    "cardholderName" TEXT,
    "billingEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClubSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClubSubscription_clubId_key" ON "ClubSubscription"("clubId");

ALTER TABLE "ClubSubscription"
  ADD CONSTRAINT "ClubSubscription_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
