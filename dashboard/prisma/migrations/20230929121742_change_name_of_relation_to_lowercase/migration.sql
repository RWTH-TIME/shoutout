/*
  Warnings:

  - You are about to drop the `Job` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Job";

-- CreateTable
CREATE TABLE "job" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "audioFile" TEXT,
    "participants" INTEGER,
    "language" TEXT,
    "status" "Status" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_name_key" ON "job"("name");
