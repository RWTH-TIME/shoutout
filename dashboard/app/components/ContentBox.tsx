"use client";

import { useState } from "react";
import { Button, Chip } from "@helpwave/hightide";
import { Job } from "../types/types";
import useJobs from "../hooks/useJob";
import useAlert from "../hooks/useAlert";
import { languageLabel } from "../utils/languages";
import { formatDateTime } from "../utils/date";

type ContentBoxProps = {
  setSelectedJob: React.Dispatch<React.SetStateAction<Job | undefined>>;
  jobDetail: Job | undefined;
};

export default function ContentBox({
  setSelectedJob,
  jobDetail,
}: ContentBoxProps) {
  const { setAlert } = useAlert();
  const { getStatusColor, downloadFile, deleteJob } = useJobs();
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function onDownload() {
    if (!jobDetail || jobDetail.status !== "FINISHED") {
      return;
    }
    try {
      setDownloadLoading(true);
      const link = document.createElement("a");
      link.href = await downloadFile(jobDetail);
      link.click();
    } catch (error) {
      console.error("Error downloading file", error);
      setAlert("Download failed", "error");
    } finally {
      setDownloadLoading(false);
    }
  }

  async function onDelete() {
    if (!jobDetail) {
      return;
    }
    setDeleteLoading(true);
    const success = await deleteJob(jobDetail);
    if (success) {
      setAlert("Job deleted", "success");
      setSelectedJob(undefined);
    } else {
      setAlert("Delete failed", "error");
    }
    setDeleteLoading(false);
  }

  if (!jobDetail) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center p-6 text-sm opacity-70">
        Select a job or create a new one.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm dark:bg-black/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide opacity-60">
              Name
            </div>
            <h2 className="text-xl font-semibold">{jobDetail.name}</h2>
          </div>
          <Chip
            color={getStatusColor(jobDetail.status)}
            coloringStyle="tonal"
            size="sm"
          >
            {jobDetail.status}
          </Chip>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-wide opacity-60">
              Model
            </div>
            <div>{jobDetail.model || "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide opacity-60">
              Language
            </div>
            <div>{languageLabel(jobDetail.language)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide opacity-60">
              Participants
            </div>
            <div>
              {jobDetail.participants ? jobDetail.participants : "Auto"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide opacity-60">
              Created
            </div>
            <div>{formatDateTime(jobDetail.createdAt)}</div>
          </div>
        </div>

        {jobDetail.error ? (
          <div className="rounded-lg border border-negative/30 bg-negative/10 p-3 text-sm">
            {jobDetail.error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            color="primary"
            isProcessing={downloadLoading}
            disabled={jobDetail.status !== "FINISHED" || downloadLoading}
            onClick={onDownload}
          >
            Download
          </Button>
          {jobDetail.status !== "RUNNING" ? (
            <Button
              color="negative"
              coloringStyle="outline"
              isProcessing={deleteLoading}
              disabled={deleteLoading}
              onClick={onDelete}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
