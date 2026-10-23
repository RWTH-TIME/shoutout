ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "model" TEXT;
UPDATE "job" SET "model" = 'tiny' WHERE "model" IS NULL;
ALTER TABLE "job" ALTER COLUMN "model" SET NOT NULL;

ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "notifyEmail" TEXT;
ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "workerId" UUID;
ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP(3);
ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "heartbeatAt" TIMESTAMP(3);
ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "error" TEXT;
ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "resultToken" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "job_resultToken_key" ON "job"("resultToken");
CREATE INDEX IF NOT EXISTS "job_owner_createdAt_idx" ON "job"("owner", "createdAt");
CREATE INDEX IF NOT EXISTS "job_status_createdAt_idx" ON "job"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "job_status_model_idx" ON "job"("status", "model");

CREATE TABLE IF NOT EXISTS "worker" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "models" TEXT[] NOT NULL,
    "info" JSONB,
    CONSTRAINT "worker_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "apiKey" (
    "id" UUID NOT NULL,
    "owner" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "ownerEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "apiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "apiKey_hash_key" ON "apiKey"("hash");
CREATE INDEX IF NOT EXISTS "apiKey_owner_idx" ON "apiKey"("owner");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_workerId_fkey'
  ) THEN
    ALTER TABLE "job" ADD CONSTRAINT "job_workerId_fkey"
      FOREIGN KEY ("workerId") REFERENCES "worker"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
