CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'AUTHENTICATED', 'PUBLIC');

ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "publicId" UUID;
ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "notifyEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "resultZipKey" TEXT;

UPDATE "job" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "job" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "job" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS "job_publicId_key" ON "job"("publicId");
CREATE INDEX IF NOT EXISTS "job_expiresAt_idx" ON "job"("expiresAt");

CREATE TABLE IF NOT EXISTS "jobFile" (
    "id" UUID NOT NULL,
    "jobId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "audioFile" TEXT NOT NULL,
    "participants" INTEGER,
    "language" TEXT,
    "resultTextKey" TEXT,
    "resultJsonKey" TEXT,
    "durationSeconds" DOUBLE PRECISION,
    CONSTRAINT "jobFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "jobFile_jobId_idx" ON "jobFile"("jobId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobFile_jobId_fkey'
  ) THEN
    ALTER TABLE "jobFile" ADD CONSTRAINT "jobFile_jobId_fkey"
      FOREIGN KEY ("jobId") REFERENCES "job"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "jobFile" (
  "id",
  "jobId",
  "position",
  "originalName",
  "audioFile",
  "participants",
  "language",
  "resultTextKey",
  "resultJsonKey",
  "durationSeconds"
)
SELECT
  gen_random_uuid(),
  j."id",
  0,
  COALESCE(j."audioFile", j."name"),
  j."audioFile",
  j."participants",
  j."language",
  NULL,
  NULL,
  NULL
FROM "job" j
WHERE j."audioFile" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "jobFile" jf WHERE jf."jobId" = j."id"
  );

UPDATE "job"
SET "resultZipKey" = 'finished-files/' ||
  CASE
    WHEN position('.' in "audioFile") > 0
      THEN left("audioFile", length("audioFile") - position('.' in reverse("audioFile")))
    ELSE "audioFile"
  END || '.zip'
WHERE "status" = 'FINISHED'
  AND "audioFile" IS NOT NULL
  AND "resultZipKey" IS NULL;

CREATE TABLE IF NOT EXISTS "userSettings" (
    "owner" UUID NOT NULL,
    "notifyEmail" TEXT,
    "notifyOnFinish" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnFail" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "userSettings_pkey" PRIMARY KEY ("owner")
);
