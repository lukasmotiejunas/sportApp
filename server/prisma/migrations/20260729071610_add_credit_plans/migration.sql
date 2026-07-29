-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('monthly', 'credits');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "creditsRemaining" INTEGER;

-- AlterTable
ALTER TABLE "MembershipPlan" ADD COLUMN     "creditCount" INTEGER,
ADD COLUMN     "planType" "PlanType" NOT NULL DEFAULT 'monthly';
