import { Status, Visibility, type job, type jobFile } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  deleteObjects,
  jobFileJsonKey,
  jobFileTextKey,
  jobResultZipKey,
  listObjectKeys,
  presignDownload,
  resultObjectKey,
  uploadObjectKey,
} from "../lib/storage";
import { isModelAvailable } from "./models";
import { generateResultToken } from "../lib/auth";
import { notifyJobEvent } from "../lib/notify";
import config from "../lib/config";
import { getUserSettings } from "./userSettingsService";
import { uniqueOriginalNames } from "../utils/file";

export type CreateJobFileInput = {
  audioFile: string;
  originalName: string;
  participants?: number | null;
  language?: string | null;
};

export type CreateJobInput = {
  name: string;
  model: string;
  participants?: number | null;
  language?: string | null;
  notifyEmail?: string | null;
  notifyEnabled?: boolean;
  owner: string;
  files: CreateJobFileInput[];
};

export type JobWithFiles = job & { files: jobFile[] };

function resolveMail(input: {
  notifyEmail?: string | null;
  notifyEnabled?: boolean;
}): { notifyEmail: string | null | undefined; notifyEnabled: boolean } {
  if (!config.MAIL_ENABLED) {
    return { notifyEmail: null, notifyEnabled: false };
  }
  return {
    notifyEmail: input.notifyEmail || undefined,
    notifyEnabled: input.notifyEnabled ?? true,
  };
}

function computeExpiresAt(): Date | null {
  const days = config.JOB_EXPIRATION_DAYS;
  if (!days || days <= 0) {
    return null;
  }
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function listJobsByOwner(owner: string, status?: Status) {
  return prisma.job.findMany({
    where: {
      owner,
      ...(status ? { status } : {}),
    },
    include: { files: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getJobByName(name: string) {
  return prisma.job.findUnique({
    where: { name },
    include: { files: { orderBy: { position: "asc" } } },
  });
}

export async function getJobById(id: number) {
  return prisma.job.findUnique({
    where: { id },
    include: { files: { orderBy: { position: "asc" } } },
  });
}

export async function getJobByPublicId(publicId: string) {
  return prisma.job.findUnique({
    where: { publicId },
    include: { files: { orderBy: { position: "asc" } } },
  });
}

export async function createJob(input: CreateJobInput) {
  if (!input.files.length) {
    throw new Error("At least one file is required");
  }

  const available = await isModelAvailable(input.model);
  if (!available) {
    throw new Error(`Model ${input.model} is not offered by any attached worker`);
  }

  const participants =
    input.participants && input.participants > 0
      ? input.participants
      : undefined;
  const language = input.language || undefined;
  const primary = input.files[0];
  const originalNames = uniqueOriginalNames(
    input.files.map((file) => file.originalName)
  );
  const mail = resolveMail(input);

  return prisma.job.create({
    data: {
      name: input.name,
      owner: input.owner,
      audioFile: primary.audioFile,
      model: input.model,
      participants,
      language,
      notifyEmail: mail.notifyEmail,
      notifyEnabled: mail.notifyEnabled,
      expiresAt: computeExpiresAt(),
      files: {
        create: input.files.map((file, index) => ({
          position: index,
          originalName: originalNames[index] ?? file.originalName,
          audioFile: file.audioFile,
          participants:
            file.participants && file.participants > 0
              ? file.participants
              : participants,
          language: file.language || language,
        })),
      },
    },
    include: { files: { orderBy: { position: "asc" } } },
  });
}

export async function updateJobForOwner(
  publicId: string,
  owner: string,
  data: {
    name?: string;
    visibility?: Visibility;
    notifyEnabled?: boolean;
  }
) {
  const job = await prisma.job.findUnique({ where: { publicId } });
  if (!job) {
    throw new Error("Job not found");
  }
  if (job.owner !== owner) {
    throw new Error("Forbidden");
  }

  return prisma.job.update({
    where: { publicId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
      ...(config.MAIL_ENABLED && data.notifyEnabled !== undefined
        ? { notifyEnabled: data.notifyEnabled }
        : {}),
    },
    include: { files: { orderBy: { position: "asc" } } },
  });
}

async function collectJobObjectKeys(jobRecord: JobWithFiles): Promise<string[]> {
  const keys: string[] = [];
  for (const file of jobRecord.files) {
    keys.push(uploadObjectKey(file.audioFile));
    if (file.resultTextKey) {
      keys.push(file.resultTextKey);
    }
    if (file.resultJsonKey) {
      keys.push(file.resultJsonKey);
    }
  }
  if (jobRecord.audioFile && jobRecord.files.length === 0) {
    keys.push(uploadObjectKey(jobRecord.audioFile));
    if (jobRecord.status === Status.FINISHED) {
      keys.push(resultObjectKey(jobRecord.audioFile));
    }
  }
  if (jobRecord.resultZipKey) {
    keys.push(jobRecord.resultZipKey);
  } else if (jobRecord.publicId) {
    keys.push(jobResultZipKey(jobRecord.publicId));
    const prefix = `${config.DOWNLOAD_FILE_TARGET_DIR}${jobRecord.publicId}/`;
    keys.push(...(await listObjectKeys(prefix)));
  }
  return Array.from(new Set(keys));
}

export async function deleteJobForOwner(jobName: string, owner: string) {
  const job = await getJobByName(jobName);
  if (!job) {
    throw new Error("Job not found");
  }
  if (job.owner !== owner) {
    throw new Error("Forbidden");
  }

  const keys = await collectJobObjectKeys(job);
  await deleteObjects(keys);
  return prisma.job.delete({ where: { name: jobName } });
}

export async function deleteJobByPublicId(publicId: string, owner: string) {
  const job = await getJobByPublicId(publicId);
  if (!job) {
    throw new Error("Job not found");
  }
  if (job.owner !== owner) {
    throw new Error("Forbidden");
  }

  const keys = await collectJobObjectKeys(job);
  await deleteObjects(keys);
  return prisma.job.delete({ where: { publicId } });
}

export async function stopJobByPublicId(publicId: string, owner: string) {
  const job = await getJobByPublicId(publicId);
  if (!job) {
    throw new Error("Job not found");
  }
  if (job.owner !== owner) {
    throw new Error("Forbidden");
  }
  if (job.status !== Status.PENDING && job.status !== Status.RUNNING) {
    throw new Error("Job is not running");
  }

  return prisma.job.update({
    where: { publicId },
    data: {
      status: Status.CANCELLED,
      workerId: null,
      claimedAt: null,
      heartbeatAt: null,
      error: "Cancelled by user",
    },
    include: { files: { orderBy: { position: "asc" } } },
  });
}

export async function getDownloadUrlForJob(jobName: string, owner: string) {
  const job = await getJobByName(jobName);
  if (!job) {
    throw new Error("Job not found");
  }
  if (job.owner !== owner) {
    throw new Error("Forbidden");
  }
  if (job.status !== Status.FINISHED) {
    throw new Error("Result not ready");
  }

  const zipKey = job.resultZipKey ?? jobResultZipKey(job.publicId);
  return presignDownload(zipKey, `${job.name}.zip`, "application/zip");
}

export async function getDownloadUrlForJobRecord(jobRecord: JobWithFiles) {
  if (jobRecord.status !== Status.FINISHED) {
    throw new Error("Result not ready");
  }
  const zipKey = jobRecord.resultZipKey ?? jobResultZipKey(jobRecord.publicId);
  return presignDownload(zipKey, `${jobRecord.name}.zip`, "application/zip");
}

export async function getFileTextDownloadUrl(
  jobRecord: JobWithFiles,
  fileId: string
) {
  const file = jobRecord.files.find((item) => item.id === fileId);
  if (!file?.resultTextKey) {
    throw new Error("Result not ready");
  }
  const baseName = file.originalName.includes(".")
    ? file.originalName.substring(0, file.originalName.lastIndexOf("."))
    : file.originalName;
  return presignDownload(file.resultTextKey, `${baseName}.txt`, "text/plain");
}

export async function completeJob(
  jobId: number,
  workerId: string,
  fileResults: Array<{ id: string; durationSeconds?: number }> = []
): Promise<void> {
  const existing = await getJobById(jobId);
  if (!existing || existing.workerId !== workerId) {
    throw new Error("Job not found");
  }

  const resultToken = generateResultToken();
  const zipKey = jobResultZipKey(existing.publicId);

  await prisma.$transaction(async (tx) => {
    for (const result of fileResults) {
      await tx.jobFile.update({
        where: { id: result.id },
        data: {
          resultTextKey: jobFileTextKey(existing.publicId, result.id),
          resultJsonKey: jobFileJsonKey(existing.publicId, result.id),
          durationSeconds: result.durationSeconds ?? null,
        },
      });
    }

    await tx.job.update({
      where: { id: jobId },
      data: {
        status: Status.FINISHED,
        resultToken,
        resultZipKey: zipKey,
        error: null,
        workerId,
        heartbeatAt: new Date(),
      },
    });
  });

  const job = await getJobById(jobId);
  if (!job) {
    return;
  }

  const settings = await getUserSettings(job.owner);
  await notifyJobEvent({
    kind: "finished",
    job,
    settings,
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

  if (!retry) {
    const failed = await getJobById(jobId);
    if (failed) {
      const settings = await getUserSettings(failed.owner);
      await notifyJobEvent({
        kind: "failed",
        job: failed,
        settings,
      });
    }
  }
}
