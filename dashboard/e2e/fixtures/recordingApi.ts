import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { mintSessionToken, E2E_OWNER_ID } from "./auth";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://admin:admin@localhost:5433/postgres?schema=public";

const S3_ENDPOINT = process.env.S3_ENDPOINT ?? "http://localhost:3900";
const S3_BUCKET = process.env.S3_BUCKET ?? "shoutout-job-bucket";
const S3_REGION = process.env.S3_REGION ?? "garage";

let prisma: PrismaClient | null = null;
let pool: Pool | null = null;

function getPrisma(): PrismaClient {
  if (!prisma) {
    pool = new Pool({ connectionString: DATABASE_URL });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

function getS3(): S3Client {
  return new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "shoutoutdevuser",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "shoutoutdevuser",
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export async function getJobByPublicId(publicId: string) {
  return getPrisma().job.findUnique({
    where: { publicId },
    include: { files: { orderBy: { position: "asc" } } },
  });
}

export async function waitForJobStatus(
  publicId: string,
  status: string,
  timeoutMs = 30_000
) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const job = await getJobByPublicId(publicId);
    if (job?.status === status) {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for job ${publicId} status ${status}`);
}

export async function listRecordingChunkKeys(publicId: string): Promise<string[]> {
  const client = getS3();
  const prefix = `to-transcribe/recordings/${publicId}/`;
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: prefix,
    })
  );
  return (response.Contents ?? [])
    .map((item) => item.Key)
    .filter((key): key is string => Boolean(key))
    .sort();
}

export async function objectExists(key: string): Promise<boolean> {
  const client = getS3();
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export async function readObjectBytes(key: string): Promise<Uint8Array> {
  const client = getS3();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    })
  );
  if (!response.Body) {
    throw new Error(`Empty body for ${key}`);
  }
  return response.Body.transformToByteArray();
}

export function looksLikeWebm(bytes: Uint8Array): boolean {
  if (bytes.length < 4) {
    return false;
  }
  return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
}

export async function sessionAuthHeaders(ownerId = E2E_OWNER_ID): Promise<HeadersInit> {
  const token = await mintSessionToken({ ownerId });
  return {
    Cookie: `next-auth.session-token=${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit & { ownerId?: string }
): Promise<{ status: number; body: T }> {
  const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3010";
  const headers = await sessionAuthHeaders(init?.ownerId);
  const response = await fetch(`${baseURL}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, body };
}

export async function disposeRecordingApi(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
  if (pool) {
    await pool.end();
    pool = null;
  }
}
