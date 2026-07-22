-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'unspecified');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('paid', 'overdue', 'pending');

-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('open', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('registered', 'cancelled', 'attended', 'no_show');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "MeasurementType" AS ENUM ('seconds', 'ms', 'distance_km', 'points');

-- CreateEnum
CREATE TYPE "GenderCategory" AS ENUM ('male', 'female', 'all');

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyFee" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "memberSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gender" "Gender" NOT NULL DEFAULT 'unspecified',
    "ageGroup" TEXT,
    "preferredDistance" TEXT,
    "emergencyContact" TEXT,
    "avatarColor" TEXT,
    "initials" TEXT,
    "photoUrl" TEXT,
    "coachNotes" TEXT,
    "membershipPlanId" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "paymentDueDate" TIMESTAMP(3),
    "lastPaymentDate" TIMESTAMP(3),
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifySms" BOOLEAN NOT NULL DEFAULT false,
    "notifyPush" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" TEXT,
    "avatarColor" TEXT,
    "initials" TEXT,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "location" TEXT,
    "capacity" INTEGER NOT NULL,
    "registrationDeadline" TIMESTAMP(3),
    "goals" TEXT[],
    "whatToBring" TEXT[],
    "status" "TrainingStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRegistration" (
    "id" TEXT NOT NULL,
    "trainingSessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'registered',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "trainingSessionId" TEXT,
    "title" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "coachNote" TEXT,
    "planBody" TEXT,
    "status" "PlanStatus" NOT NULL DEFAULT 'draft',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "measurementType" "MeasurementType" NOT NULL,
    "unit" TEXT NOT NULL,
    "lowerIsBetter" BOOLEAN NOT NULL,
    "genderCategory" "GenderCategory" NOT NULL DEFAULT 'all',
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LeaderboardCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardResult" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "value" DECIMAL(12,3) NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,

    CONSTRAINT "LeaderboardResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingRegistration_trainingSessionId_memberId_key" ON "TrainingRegistration"("trainingSessionId", "memberId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_membershipPlanId_fkey" FOREIGN KEY ("membershipPlanId") REFERENCES "MembershipPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRegistration" ADD CONSTRAINT "TrainingRegistration_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRegistration" ADD CONSTRAINT "TrainingRegistration_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardResult" ADD CONSTRAINT "LeaderboardResult_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LeaderboardCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardResult" ADD CONSTRAINT "LeaderboardResult_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
