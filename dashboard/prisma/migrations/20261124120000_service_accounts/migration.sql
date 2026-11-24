CREATE TABLE "serviceAccount" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "serviceAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "serviceAccount_name_key" ON "serviceAccount"("name");

ALTER TABLE "apiKey" ADD COLUMN "serviceAccountId" UUID;

ALTER TABLE "job" ADD COLUMN "onBehalfOf" TEXT;

CREATE TABLE "usageEvent" (
    "id" UUID NOT NULL,
    "serviceAccountId" UUID NOT NULL,
    "jobId" INTEGER NOT NULL,
    "onBehalfOf" TEXT,
    "audioSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "files" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usageEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usageEvent_jobId_key" ON "usageEvent"("jobId");
CREATE INDEX "usageEvent_serviceAccountId_createdAt_idx" ON "usageEvent"("serviceAccountId", "createdAt");
CREATE INDEX "apiKey_serviceAccountId_idx" ON "apiKey"("serviceAccountId");

ALTER TABLE "apiKey" ADD CONSTRAINT "apiKey_serviceAccountId_fkey" FOREIGN KEY ("serviceAccountId") REFERENCES "serviceAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usageEvent" ADD CONSTRAINT "usageEvent_serviceAccountId_fkey" FOREIGN KEY ("serviceAccountId") REFERENCES "serviceAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usageEvent" ADD CONSTRAINT "usageEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
