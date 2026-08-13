-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "bookedByName" TEXT NOT NULL,
    "bookedByEmail" TEXT NOT NULL,
    "inviteEmails" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_date_startTime_key" ON "Meeting"("date", "startTime");
