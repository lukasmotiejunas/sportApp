-- Weekly training cap per membership plan. NULL means unlimited.

ALTER TABLE "MembershipPlan"
  ADD COLUMN "trainingsPerWeek" INTEGER;
