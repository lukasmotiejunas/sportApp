-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "notifyNewMember" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyNewTraining" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyPayment" BOOLEAN NOT NULL DEFAULT false;
