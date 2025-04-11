"use client";
import useSWR from "swr";
import { BulkJob, Job, STATUS } from "../types/types";

async function fetcher<JSON>(
  input: RequestInfo,
  init?: RequestInit
): Promise<JSON> {
  const res = await fetch(input, init);

  if (!res.ok) throw Error("Failed to fetch Jobs");

  const data = await res.json();

  if (Array.isArray(data.jobs)) return data.jobs;
  else throw new Error("Invalid response format for jobs");
}

export default function useJobs(id: number | undefined = undefined) {
  const {
    data: jobs,
    error,
    mutate,
  } = useSWR<Job[], Error>(id ? `/api/job/${id}` : "/api/job/", fetcher);

  async function createJob(job: Job | BulkJob) {
    try {
      if (job.audioFile instanceof File) {
        // get presigned url to send audio file directly to minio from frontend   
        const presignedUrlData = await fetch(
          `/api/minio?fileName=${job.audioFile?.name}`,
          {
            method: "GET",
          }
        );

        if (!presignedUrlData.ok)
          throw new Error("Could not get minio presigned url");

        const { presignedUrl, uuidFileName } = await presignedUrlData.json();
        // send file to minio from frontend
        const audioFileResponse = await fetch(presignedUrl, {
          method: "PUT",
          body: job.audioFile,
        });

        if (!audioFileResponse.ok)
          throw new Error("Could not send audio file to miniobucket");

        // send job to backend with url to minio file
        const sendJobResponse = await fetch("/api/job", {
          headers: new Headers({
            "Content-Type": "application/json",
            Accept: "application/json",
          }),
          method: "POST",
          body: JSON.stringify({
            name: job.name,
            participants: "participants" in job ? parseInt(job.participants as unknown as string, 10) : undefined,
            language: "language" in job ? job.language : undefined,
            audioFile: uuidFileName,
          }),
        });

        if (!sendJobResponse.ok) throw new Error("Could not insert Job");

        const jobData = await sendJobResponse.json();
        const updatedJobs = Array.isArray(jobs)
          ? [...jobs, jobData.res]
          : [jobData.res];
        mutate(updatedJobs, false);
        return true;
      } else throw new Error("Audio file does not exist");
    } catch (error) {
      return false;
    }
  }

  function getStatusColor(status: string): "default" | "error" | "success" | "warning" {
    if (status === STATUS.Pending) return "default";
    if (status === STATUS.Failed) return "error";
    if (status === STATUS.Finished) return "success";
    if (status === STATUS.Running) return "warning";
    return "default";
  }

  async function downloadFile(job: Job): Promise<string> {
    const presignedURLData = await fetch(
      `/api/minio/download?fileName=${job.audioFile}&jobName=${job.name}`,
      {
        method: "GET",
      }
    );
    if (!presignedURLData.ok)
      throw new Error("Could not get minio presigned url");

    const { presignedUrl } = await presignedURLData.json();
    return presignedUrl;
  }

  async function deleteJob(job: Job | BulkJob): Promise<boolean> {
    try {
      // Delete files from minio
      const bucket_delete = await fetch(
        `/api/minio?fileName=${job.audioFile}&status=${job.status}`,
        {
          method: "DELETE",
        }
      )

      if (!bucket_delete.ok) throw new Error("Could not delete from minio");

      // Delete files from db & queue
      const deleteJobResponse = await fetch(`/api/job?jobName=${job.name}`, {
        headers: new Headers({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        method: "DELETE",
      });
      if (!deleteJobResponse.ok) throw new Error("Could not delete from DB");
      const updatedJobs = jobs?.filter(t => t.name !== job.name)
      mutate(updatedJobs, false);
      return true
    } catch (e) {
      return false
    }
  }

  const LANGUAGE_DATA = [
    {
      value: "",
      name: "None",
    },
    {
      value: "de",
      name: "Deutsch",
    },
    {
      value: "en",
      name: "Englisch",
    },
  ];

  return {
    jobs,
    error: error,
    createJob: createJob,
    getStatusColor: getStatusColor,
    downloadFile: downloadFile,
    deleteJob: deleteJob,
    LANGUAGE_DATA: LANGUAGE_DATA,
  };
}
