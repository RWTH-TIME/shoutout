import { Status } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  deleteObjects,
  presignDownload,
  resultObjectKey,
  uploadObjectKey,
} from "../lib/storage";
import { isModelAvailable } from "./models";
import { generateResultToken } from "../lib/auth";
import { notifyJobReady } from "../lib/notify";
import config from "../lib/config";

export type CreateJobInput = {
  name: string;
  audioFile: string;
  model: string;
  participants?: number | null;
  language?: string | null;
  notifyEmail?: string | null;
  owner: string;
};

export async function listJobsByOwner(owner: string, status?: Status) {
  return prisma.job.findMany({
    where: {
      owner,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getJobByName(name: string) {
  return prisma.job.findUnique({ where: { name } });
}

export async function getJobById(id: number) {
  return prisma.job.findUnique({ where: { id } });
}

export async function createJob(input: CreateJobInput) {
  const available = await isModelAvailable(input.model);
  if (!available) {
    throw new Error(`Model ${input.model} is not offered by any attached worker`);
  }

  return prisma.job.create({
    data: {
      name: input.name,
      owner: input.owner,
      audioFile: input.audioFile,
      model: input.model,
      participants:
        input.participants && input.participants > 0
          ? input.participants
          : undefined,
      language: input.language || undefined,
      notifyEmail: input.notifyEmail || undefined,
    },
  });
}

export async function deleteJobForOwner(jobName: string, owner: string) {
  const job = await prisma.job.findUnique({ where: { name: jobName } });
  if (!job) {
    throw new Error("Job not found");
  }
  if (job.owner !== owner) {
    throw new Error("Forbidden");
  }

  const keys = [];
  if (job.audioFile) {
    keys.push(uploadObjectKey(job.audioFile));
    if (job.status === Status.FINISHED) {
      keys.push(resultObjectKey(job.audioFile));
    }
  }
  await deleteObjects(keys);
  return prisma.job.delete({ where: { name: jobName } });
}

export async function getDownloadUrlForJob(jobName: string, owner: string) {
  const job = await prisma.job.findUnique({ where: { name: jobName } });
  if (!job) {
    throw new Error("Job not found");
  }
  if (job.owner !== owner) {
    throw new Error("Forbidden");
  }
  if (job.status !== Status.FINISHED || !job.audioFile) {
    throw new Error("Result not ready");
  }
  return presignDownload(job.audioFile, job.name);
}

export async function completeJob(
  jobId: number,
  workerId: string
): Promise<void> {
  const resultToken = generateResultToken();
  const job = await prisma.job.update({
    where: { id: jobId },
    data: {
      status: Status.FINISHED,
      resultToken,
      error: null,
      workerId,
      heartbeatAt: new Date(),
    },
  });

  const downloadUrl = `${config.NEXTAUTH_URL.replace(/\/$/, "")}/api/downloads/${resultToken}`;
  await notifyJobReady({
    jobName: job.name,
    model: job.model,
    downloadUrl,
    notifyEmail: job.notifyEmail,
  });
}

export async function failJob(
  jobId: number,
  workerId: string,
  error: string
): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.workerId !== workerId) {
    throw new Error("Job not found");
  }

  const attempts = job.attempts + 1;
  const retry = attempts < config.WORKER_MAX_ATTEMPTS;

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: retry ? Status.PENDING : Status.FAILED,
      attempts,
      error,
      workerId: retry ? null : workerId,
      claimedAt: retry ? null : job.claimedAt,
      heartbeatAt: retry ? null : new Date(),
    },
  });
}
