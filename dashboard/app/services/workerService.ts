import { Prisma, Status } from "@prisma/client";
import { prisma } from "../lib/prisma";
import config from "../lib/config";
import { generateWorkerToken } from "../lib/auth";
import {
  jobFileJsonKey,
  jobFileTextKey,
  jobResultZipKey,
  presignInputDownload,
  presignResultUpload,
} from "../lib/storage";

export async function registerWorker(input: {
  name: string;
  models: string[];
  info?: Record<string, unknown>;
}) {
  const { token, hash } = generateWorkerToken();
  const worker = await prisma.worker.create({
    data: {
      name: input.name,
      models: input.models,
      info: (input.info ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      tokenHash: hash,
      lastSeenAt: new Date(),
    },
  });
  return { worker, token };
}

export async function updateWorkerPresence(
  workerId: string,
  models?: string[],
  info?: Record<string, unknown>
) {
  return prisma.worker.update({
    where: { id: workerId },
    data: {
      lastSeenAt: new Date(),
      ...(models ? { models } : {}),
      ...(info !== undefined
        ? { info: info as Prisma.InputJsonValue }
        : {}),
    },
  });
}

async function claimOnce(workerId: string, models: string[]) {
  const staleBefore = new Date(Date.now() - config.WORKER_HEARTBEAT_STALE_MS);

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ id: number }>
    >`
      SELECT id FROM job
      WHERE model = ANY(${models})
        AND (
          status = 'PENDING'
          OR (
            status = 'RUNNING'
            AND "heartbeatAt" IS NOT NULL
            AND "heartbeatAt" < ${staleBefore}
          )
        )
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `;

    if (rows.length === 0) {
      return null;
    }

    const job = await tx.job.update({
      where: { id: rows[0].id },
      data: {
        status: Status.RUNNING,
        workerId,
        claimedAt: new Date(),
        heartbeatAt: new Date(),
      },
      include: { files: { orderBy: { position: "asc" } } },
    });

    return job;
  });
}

export async function claimJob(
  workerId: string,
  models: string[],
  timeoutMs = config.CLAIM_POLL_MS
) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const job = await claimOnce(workerId, models);
    if (job) {
      let files = job.files;
      if (files.length === 0 && job.audioFile) {
        const created = await prisma.jobFile.create({
          data: {
            jobId: job.id,
            position: 0,
            originalName: job.audioFile,
            audioFile: job.audioFile,
            participants: job.participants,
            language: job.language,
          },
        });
        files = [created];
      }
      if (files.length === 0) {
        throw new Error("Claimed job has no audio files");
      }

      const fileClaims = await Promise.all(
        files.map(async (file) => {
          const [inputUrl, textUploadUrl, jsonUploadUrl] = await Promise.all([
            presignInputDownload(file.audioFile),
            presignResultUpload(jobFileTextKey(job.publicId, file.id)),
            presignResultUpload(jobFileJsonKey(job.publicId, file.id)),
          ]);
          return {
            id: file.id,
            originalName: file.originalName,
            participants: file.participants ?? job.participants,
            language: file.language ?? job.language,
            inputUrl,
            textUploadUrl,
            jsonUploadUrl,
          };
        })
      );

      const zipUploadUrl = await presignResultUpload(
        jobResultZipKey(job.publicId)
      );

      return {
        job,
        files: fileClaims,
        zipUploadUrl,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return null;
}

export async function heartbeatJob(jobId: number, workerId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.workerId !== workerId) {
    throw new Error("Job not found");
  }
  return prisma.job.update({
    where: { id: jobId },
    data: { heartbeatAt: new Date() },
  });
}
