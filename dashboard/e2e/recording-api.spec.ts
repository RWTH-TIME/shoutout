import { expect, test } from "@playwright/test";
import { Status } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { E2E_OWNER_ID } from "./fixtures/auth";
import { apiJson } from "./fixtures/recordingApi";
import { registerFakeWorker } from "./fixtures/worker";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://admin:admin@localhost:5433/postgres?schema=public";

function createPrisma() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return {
    prisma: new PrismaClient({ adapter }),
    pool,
  };
}

async function createRecordingJob(name: string) {
  const { prisma, pool } = createPrisma();
  try {
    const job = await prisma.job.create({
      data: {
        name,
        owner: E2E_OWNER_ID,
        audioFile: `${crypto.randomUUID()}.webm`,
        model: "tiny",
        status: Status.RECORDING,
        heartbeatAt: new Date(),
        files: {
          create: [
            {
              position: 0,
              originalName: `${name}.webm`,
              audioFile: `${crypto.randomUUID()}.webm`,
            },
          ],
        },
      },
      include: { files: true },
    });
    return job;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function putChunk(publicId: string, sequence: number) {
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? "http://localhost:3900",
    region: process.env.S3_REGION ?? "garage",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "shoutoutdevuser",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "shoutoutdevuser",
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const padded = sequence.toString().padStart(8, "0");
  const key = `to-transcribe/recordings/${publicId}/${padded}.part`;
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET ?? "shoutout-job-bucket",
      Key: key,
      Body: Buffer.from([0x1a, 0x45, 0xdf, 0xa3, sequence, 1, 2, 3]),
      ContentType: "application/octet-stream",
    })
  );
}

test.describe("recording API contracts", () => {
  test.beforeAll(async () => {
    await registerFakeWorker();
  });

  test("chunks returns 401 without auth", async () => {
    const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3010";
    const response = await fetch(
      `${baseURL}/api/jobs/00000000-0000-0000-0000-000000000000/recording/chunks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequence: 0 }),
      }
    );
    expect(response.status).toBe(401);
  });

  test("chunks returns 404 for missing job", async () => {
    const { status, body } = await apiJson<{ error: string; code?: string }>(
      "/api/jobs/00000000-0000-0000-0000-000000000000/recording/chunks",
      {
        method: "POST",
        body: JSON.stringify({ sequence: 0 }),
      }
    );
    expect(status).toBe(404);
    expect(body.code).toBe("JOB_NOT_FOUND");
  });

  test("chunks returns 400 for invalid body", async () => {
    const job = await createRecordingJob(`e2e-api-badbody-${Date.now()}`);
    const { status, body } = await apiJson<{ error: string; code?: string }>(
      `/api/jobs/${job.publicId}/recording/chunks`,
      {
        method: "POST",
        body: JSON.stringify({ sequence: -1 }),
      }
    );
    expect(status).toBe(400);
    expect(body.code).toBe("VALIDATION");
  });

  test("chunks returns 409 when job is not recording", async () => {
    const job = await createRecordingJob(`e2e-api-notrec-${Date.now()}`);
    const { prisma, pool } = createPrisma();
    try {
      await prisma.job.update({
        where: { publicId: job.publicId },
        data: { status: Status.PENDING },
      });
    } finally {
      await prisma.$disconnect();
      await pool.end();
    }

    const { status, body } = await apiJson<{ error: string; code?: string }>(
      `/api/jobs/${job.publicId}/recording/chunks`,
      {
        method: "POST",
        body: JSON.stringify({ sequence: 0 }),
      }
    );
    expect(status).toBe(409);
    expect(body.code).toBe("JOB_NOT_RECORDING");
  });

  test("chunks returns 200 while recording", async () => {
    const job = await createRecordingJob(`e2e-api-ok-${Date.now()}`);
    const { status, body } = await apiJson<{
      presignedUrl: string;
      objectKey: string;
    }>(`/api/jobs/${job.publicId}/recording/chunks`, {
      method: "POST",
      body: JSON.stringify({ sequence: 0 }),
    });
    expect(status).toBe(200);
    expect(body.presignedUrl).toContain("http");
    expect(body.objectKey).toContain(job.publicId);
  });

  test("finish is idempotent when already pending with object", async () => {
    const job = await createRecordingJob(`e2e-api-finish-${Date.now()}`);
    await putChunk(job.publicId, 0);

    const first = await apiJson<{ job: { status: string } }>(
      `/api/jobs/${job.publicId}/recording/finish`,
      {
        method: "POST",
        body: JSON.stringify({ chunkCount: 1, durationSeconds: 1 }),
      }
    );
    expect(first.status).toBe(200);
    expect(first.body.job.status).toBe("PENDING");

    const second = await apiJson<{ job: { status: string } }>(
      `/api/jobs/${job.publicId}/recording/finish`,
      {
        method: "POST",
        body: JSON.stringify({ chunkCount: 1, durationSeconds: 1 }),
      }
    );
    expect(second.status).toBe(200);
    expect(second.body.job.status).toBe("PENDING");
  });

  test("finish returns 409 on chunk count mismatch", async () => {
    const job = await createRecordingJob(`e2e-api-mismatch-${Date.now()}`);
    await putChunk(job.publicId, 0);
    const { status, body } = await apiJson<{ error: string; code?: string }>(
      `/api/jobs/${job.publicId}/recording/finish`,
      {
        method: "POST",
        body: JSON.stringify({ chunkCount: 3, durationSeconds: 1 }),
      }
    );
    expect(status).toBe(409);
    expect(body.code).toBe("CONFLICT");
  });
});
