"use client";

import useSWR from "swr";
import { BulkFileEntry, Job, STATUS } from "../types/types";
import { isActiveStatus } from "../utils/status";
import { mapWithConcurrency } from "../utils/concurrency";
import { putPresignedObject } from "../utils/file";

async function fetcher<JSON>(input: RequestInfo): Promise<JSON> {
  const res = await fetch(input);
  if (!res.ok) {
    throw Error("Failed to fetch Jobs");
  }
  const data = await res.json();
  if (Array.isArray(data.jobs)) {
    return data.jobs;
  }
  throw new Error("Invalid response format for jobs");
}

async function uploadAndCreate(job: {
  name: string;
  model: string;
  participants?: number;
  language?: string;
  audioFile: File;
}): Promise<Job> {
  const presignedUrlData = await fetch(
    `/api/files?fileName=${encodeURIComponent(job.audioFile.name)}`,
    { method: "GET" }
  );
  if (!presignedUrlData.ok) {
    throw new Error("Could not get presigned url");
  }

  const { presignedUrl, uuidFileName } = await presignedUrlData.json();
  const audioFileResponse = await putPresignedObject(
    presignedUrl,
    job.audioFile
  );
  if (!audioFileResponse.ok) {
    throw new Error("Could not upload audio file");
  }

  const sendJobResponse = await fetch("/api/job", {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      name: job.name,
      model: job.model,
      participants: job.participants,
      language: job.language,
      audioFile: uuidFileName,
    }),
  });

  if (!sendJobResponse.ok) {
    const error = await sendJobResponse.json().catch(() => ({}));
    throw new Error(error.error ?? "Could not insert Job");
  }

  const jobData = await sendJobResponse.json();
  return jobData.res as Job;
}

export default function useJobs() {
  const {
    data: jobs,
    error,
    mutate,
  } = useSWR<Job[], Error>("/api/job/", fetcher, {
    refreshInterval: (data) =>
      data?.some((job) => isActiveStatus(job.status)) ? 4000 : 0,
  });

  async function createJobs(
    entries: BulkFileEntry[]
  ): Promise<Array<{ name: string; ok: boolean; error?: string }>> {
    const results = await mapWithConcurrency(entries, 4, async (entry) => {
      try {
        const created = await uploadAndCreate({
          name: entry.name,
          model: entry.model,
          participants: entry.participants,
          language: entry.language,
          audioFile: entry.file,
        });
        await mutate(
          (current) => (current ? [created, ...current] : [created]),
          false
        );
        return { name: entry.name, ok: true };
      } catch (createError) {
        return {
          name: entry.name,
          ok: false,
          error:
            createError instanceof Error
              ? createError.message
              : "Failed to create job",
        };
      }
    });
    await mutate();
    return results;
  }

  async function downloadFile(job: Job): Promise<string> {
    const response = await fetch(
      `/api/files/download?jobName=${encodeURIComponent(job.name)}`,
      { method: "GET" }
    );
    if (!response.ok) {
      throw new Error("Could not get download url");
    }
    const { presignedUrl } = await response.json();
    return presignedUrl;
  }

  async function deleteJob(job: Job): Promise<boolean> {
    try {
      if (job.audioFile && typeof job.audioFile === "string") {
        await fetch(
          `/api/files?fileName=${encodeURIComponent(job.audioFile)}&status=${job.status}&jobName=${encodeURIComponent(job.name)}`,
          { method: "DELETE" }
        );
      }

      const deleteJobResponse = await fetch(
        `/api/job?jobName=${encodeURIComponent(job.name)}`,
        { method: "DELETE" }
      );
      if (!deleteJobResponse.ok) {
        throw new Error("Could not delete from DB");
      }
      mutate(
        jobs?.filter((item) => item.name !== job.name),
        false
      );
      return true;
    } catch (deleteError) {
      console.error("Error Deleting a Job", deleteError);
      return false;
    }
  }

  return {
    jobs,
    error,
    createJobs,
    downloadFile,
    deleteJob,
  };
}

export { STATUS };
