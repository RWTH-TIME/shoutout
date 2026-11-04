-- AlterTable
ALTER TABLE "job" ADD COLUMN "claimCount" INTEGER NOT NULL DEFAULT 0;

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "jobId" INTEGER,
    "kind" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "recipient" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_dedupeKey_key" ON "notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "notification_createdAt_idx" ON "notification"("createdAt");

-- CreateIndex
CREATE INDEX "notification_jobId_idx" ON "notification"("jobId");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
