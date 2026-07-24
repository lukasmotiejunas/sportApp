-- Multi-tenancy: introduce Club and scope existing entities by clubId.

-- 1. Add new enum value for super_admin.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';

-- 2. Create Club table.
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");

-- 3. Seed a default club so existing rows can be backfilled without violating NOT NULL.
INSERT INTO "Club" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES ('club_default', 'Default Club', 'default', NOW(), NOW());

-- 4. Add nullable clubId columns to tenant-scoped tables.
ALTER TABLE "User"           ADD COLUMN "clubId" TEXT;
ALTER TABLE "Member"         ADD COLUMN "clubId" TEXT;
ALTER TABLE "Coach"          ADD COLUMN "clubId" TEXT;
ALTER TABLE "TrainingSession" ADD COLUMN "clubId" TEXT;
ALTER TABLE "MembershipPlan" ADD COLUMN "clubId" TEXT;
ALTER TABLE "LeaderboardCategory" ADD COLUMN "clubId" TEXT;

-- 5. Backfill every existing row to the default club.
UPDATE "User"                SET "clubId" = 'club_default' WHERE "clubId" IS NULL;
UPDATE "Member"              SET "clubId" = 'club_default';
UPDATE "Coach"               SET "clubId" = 'club_default';
UPDATE "TrainingSession"     SET "clubId" = 'club_default';
UPDATE "MembershipPlan"      SET "clubId" = 'club_default';
UPDATE "LeaderboardCategory" SET "clubId" = 'club_default';

-- 6. Enforce NOT NULL on all except User (super_admin has no club).
ALTER TABLE "Member"              ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "Coach"               ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "TrainingSession"     ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "MembershipPlan"      ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "LeaderboardCategory" ALTER COLUMN "clubId" SET NOT NULL;

-- 7. FK constraints.
ALTER TABLE "User"
  ADD CONSTRAINT "User_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Member"
  ADD CONSTRAINT "Member_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Coach"
  ADD CONSTRAINT "Coach_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingSession"
  ADD CONSTRAINT "TrainingSession_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MembershipPlan"
  ADD CONSTRAINT "MembershipPlan_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaderboardCategory"
  ADD CONSTRAINT "LeaderboardCategory_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. Indexes.
CREATE INDEX "User_clubId_idx"                ON "User"("clubId");
CREATE INDEX "Member_clubId_idx"              ON "Member"("clubId");
CREATE INDEX "Coach_clubId_idx"               ON "Coach"("clubId");
CREATE INDEX "TrainingSession_clubId_idx"     ON "TrainingSession"("clubId");
CREATE INDEX "MembershipPlan_clubId_idx"      ON "MembershipPlan"("clubId");
CREATE INDEX "LeaderboardCategory_clubId_idx" ON "LeaderboardCategory"("clubId");
