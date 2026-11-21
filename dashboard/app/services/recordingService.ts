import { Status } from "@prisma/client";
import { prisma } from "../lib/prisma";
import config from "../lib/config";
import {
  concatObjects,
  deleteObjects,
  listObjectKeys,
  objectExists,
  presignUpload,
  recordingChunkKey,
  recordingChunkPrefix,
  uploadObjectKey,
} from "../lib/storage";
import {
  createJob,
  deleteJobByPublicId,
  getJobByPublicId,
  type JobWithFiles,
} from "./jobService";

export type StartRecordingInput = {
  name: string;
  model: string;
  participants?: number | null;
  language?: string | null;
  notifyEmail?: string | null;
  notifyEnabled?: boolean;
  owner: string;
  extension: string;
  originalName: string;
  mimeType: string;
};

function normalizeExtension(extension: string): string {
  const trimmed = extension.trim().toLowerCase();
  if (!trimmed) {
    return ".webm";
  }
  return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

function parseSequenceFromKey(key: string, prefix: string): number | null {
  if (!key.startsWith(prefix)) {
    return null;
  }
  const name = key.slice(prefix.length);
  const match = /^(\d+)\.part$/.exec(name);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

export async function startRecording(
  input: StartRecordingInput
): Promise<JobWithFiles> {
  const extension = normalizeExtension(input.extension);
  const audioFile = `${crypto.randomUUID()}${extension}`;

  return createJob({
    name: input.name,
    model: input.model,
    participants: input.participants,
    language: input.language,
    notifyEmail: input.notifyEmail,
    notifyEnabled: input.notifyEnabled,
    owner: input.owner,
    status: Status.RECORDING,
    files: [
      {
        audioFile,
        originalName: input.originalName.endsWith(extension)
          ? input.originalName
          : `${input.originalName}${extension}`,
      },
    ],
  });
}

export async function presignRecordingChunk(
  publicId: string,
  owner: string,
  sequence: number
): Promise<{ presignedUrl: string; objectKey: string }> {
  if (!Number.isInteger(sequence) || sequence < 0) {
    throw new Error("Invalid sequence");
  }

  const job = await getJobByPublicId(publicId);
  if (!job) {
    throw new Error("Job not found");
  }
  if (job.owner !== owner) {
    throw new Error("Forbidden");
  }
  if (job.status !== Status.RECORDING) {
    throw new Error("Job is not recording");
  }

  await prisma.job.update({
    where: { publicId },
    data: { heartbeatAt: new Date() },
  });

  const objectKey = recordingChunkKey(publicId, sequence);
  const fileName = objectKey.slice(config.UPLOAD_FILE_TARGET_DIR.length);
  const presignedUrl = await presignUpload(fileName);
  return { presignedUrl, objectKey };
}

export async function finishRecording(
  publicId: string,
  owner: string,
  chunkCount: number,
  durationSeconds?: number
): Promise<JobWithFiles> {
  if (!Number.isInteger(chunkCount) || chunkCount <= 0) {
    throw new Error("At least one chunk is required");
  }

  const job = await getJobByPublicId(publicId);
  if (!job) {
    throw new Error("Job not found");
  }
  if (job.owner !== owner) {
    throw new Error("Forbidden");
  }

  const primary = job.files[0];
  if (!primary) {
    throw new Error("Recording has no audio file");
  }

  if (job.status !== Status.RECORDING) {
    if (job.status === Status.PENDING || job.status === Status.RUNNING) {
      const exists = await objectExists(uploadObjectKey(primary.audioFile));
      if (exists) {
        return job;
      }
    }
    throw new Error("Job is not recording");
  }

  const prefix = recordingChunkPrefix(publicId);
  const keys = (await listObjectKeys(prefix)).sort();
  const sequences = keys
    .map((key) => parseSequenceFromKey(key, prefix))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  if (sequences.length !== chunkCount) {
    throw new Error(
      `Expected ${chunkCount} chunks, found ${sequences.length}`
    );
  }

  for (let index = 0; index < chunkCount; index += 1) {
    if (sequences[index] !== index) {
      throw new Error(`Missing recording chunk ${index}`);
    }
  }

  const orderedKeys = sequences.map((sequence) =>
    recordingChunkKey(publicId, sequence)
  );
  const contentType = primary.originalName.toLowerCase().endsWith(".mp4")
    ? "audio/mp4"
    : "audio/webm";

  await concatObjects(
    orderedKeys,
    uploadObjectKey(primary.audioFile),
    contentType
  );
  await deleteObjects(orderedKeys);

  const transition = await prisma.job.updateMany({
    where: {
      publicId,
      owner,
      status: Status.RECORDING,
    },
    data: {
      status: Status.PENDING,
      heartbeatAt: null,
      error: null,
    },
  });
  if (transition.count === 0) {
    const refreshed = await getJobByPublicId(publicId);
    if (
      refreshed &&
      (refreshed.status === Status.PENDING ||
        refreshed.status === Status.RUNNING)
    ) {
      return refreshed;
    }
    throw new Error("Job is not recording");
  }

  if (durationSeconds !== undefined && Number.isFinite(durationSeconds)) {
    await prisma.jobFile.update({
      where: { id: primary.id },
      data: { durationSeconds },
    });
  }

  const updated = await getJobByPublicId(publicId);
  if (!updated) {
    throw new Error("Job not found");
  }
  return updated;
}

export async function abandonStaleRecordings(): Promise<{
  finished: number;
  deleted: number;
}> {
  const staleBefore = new Date(Date.now() - config.RECORDING_STALE_MS);
  const staleJobs = await prisma.job.findMany({
    where: {
      status: Status.RECORDING,
      OR: [{ heartbeatAt: null }, { heartbeatAt: { lt: staleBefore } }],
    },
    include: { files: { orderBy: { position: "asc" } } },
  });

  let finished = 0;
  let deleted = 0;

  for (const job of staleJobs) {
    const keys = await listObjectKeys(recordingChunkPrefix(job.publicId));
    const sequences = keys
      .map((key) =>
        parseSequenceFromKey(key, recordingChunkPrefix(job.publicId))
      )
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b);

    if (sequences.length === 0) {
      await deleteJobByPublicId(job.publicId, job.owner);
      deleted += 1;
      continue;
    }

    try {
      await finishRecording(job.publicId, job.owner, sequences.length);
      finished += 1;
    } catch {
      await deleteJobByPublicId(job.publicId, job.owner);
      deleted += 1;
    }
  }

  return { finished, deleted };
}
