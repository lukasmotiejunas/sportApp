/*
  Warnings:

  - You are about to drop the column `emergencyContact` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `preferredDistance` on the `Member` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Member" DROP COLUMN "emergencyContact",
DROP COLUMN "preferredDistance";
