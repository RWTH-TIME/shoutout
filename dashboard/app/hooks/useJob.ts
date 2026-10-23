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

async function uploadFile(file: File): Promise<{
  uuidFileName: string;
  originalName: string;
}> {
  const presignedUrlData = await fetch(
    `/api/files?fileName=${encodeURIComponent(file.name)}`,
    { method: "GET" }
  );
  if (!presignedUrlData.ok) {
    throw new Error("Could not get presigned url");
  }

  const { presignedUrl, uuidFileName } = await presignedUrlData.json();
  const audioFileResponse = await putPresignedObject(presignedUrl, file);
  if (!audioFileResponse.ok) {
    throw new Error("Could not upload audio file");
  }

  return { uuidFileName, originalName: file.name };
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

  async function createJob(input: {
    name: string;
    model: string;
    participants?: number;
    language?: string;
    notifyEnabled?: boolean;
    entries: BulkFileEntry[];
  }): Promise<Job> {
    const uploaded = await mapWithConcurrency(input.entries, 4, async (entry) => {
      const result = await uploadFile(entry.file);
      return {
        audioFile: result.uuidFileName,
        originalName: result.originalName,
        participants: entry.participants,
        language: entry.language,
      };
    });

    const sendJobResponse = await fetch("/api/job", {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        model: input.model,
        participants: input.participants,
        language: input.language,
        notifyEnabled: input.notifyEnabled,
        files: uploaded,
      }),
    });

    if (!sendJobResponse.ok) {
      const errorBody = await sendJobResponse.json().catch(() => ({}));
      throw new Error(errorBody.error ?? "Could not insert Job");
    }

    const jobData = await sendJobResponse.json();
    const created = jobData.res as Job;
    await mutate(
      (current) => (current ? [created, ...current] : [created]),
      false
    );
    await mutate();
    return created;
  }

  async function downloadFile(job: Job): Promise<string> {
    if (!job.publicId) {
      throw new Error("Missing job id");
    }
    return `/api/jobs/${job.publicId}/download`;
  }

  async function deleteJob(job: Job): Promise<boolean> {
    try {
      if (job.publicId) {
        const deleteJobResponse = await fetch(`/api/jobs/${job.publicId}`, {
          method: "DELETE",
        });
        if (!deleteJobResponse.ok) {
          throw new Error("Could not delete from DB");
        }
      } else {
        const deleteJobResponse = await fetch(
          `/api/job?jobName=${encodeURIComponent(job.name)}`,
          { method: "DELETE" }
        );
        if (!deleteJobResponse.ok) {
          throw new Error("Could not delete from DB");
        }
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

  async function updateJob(
    publicId: string,
    patch: {
      name?: string;
      visibility?: string;
      notifyEnabled?: boolean;
    }
  ): Promise<Job> {
    const response = await fetch(`/api/jobs/${publicId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error ?? "Could not update job");
    }
    const data = await response.json();
    const updated = data.job as Job;
    await mutate(
      (current) =>
        current
          ? current.map((item) =>
              item.publicId === publicId ? updated : item
            )
          : [updated],
      false
    );
    return updated;
  }

  return {
    jobs,
    error,
    createJob,
    downloadFile,
    deleteJob,
    updateJob,
    mutate,
  };
}

export { STATUS };
