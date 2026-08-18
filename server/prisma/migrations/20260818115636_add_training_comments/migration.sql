-- CreateEnum
CREATE TYPE "CommentAuthorType" AS ENUM ('member', 'coach', 'admin');

-- CreateTable
CREATE TABLE "TrainingComment" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "trainingSessionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorType" "CommentAuthorType" NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingComment_trainingSessionId_idx" ON "TrainingComment"("trainingSessionId");

-- CreateIndex
CREATE INDEX "TrainingComment_clubId_idx" ON "TrainingComment"("clubId");

-- AddForeignKey
ALTER TABLE "TrainingComment" ADD CONSTRAINT "TrainingComment_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingComment" ADD CONSTRAINT "TrainingComment_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
