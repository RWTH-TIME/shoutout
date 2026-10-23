"use client";

import { useState } from "react";
import { Button, ConfirmDialog, useLocalization } from "@helpwave/hightide";
import { Job } from "../types/types";
import useJobs from "../hooks/useJob";
import useAlert from "../hooks/useAlert";
import useAppTranslation from "../hooks/useAppTranslation";
import { languageLabel } from "../utils/languages";
import { formatDateTime } from "../utils/date";
import StatusChip from "./StatusChip";
import AudioDropzone from "./upload/AudioDropzone";
import CreateJobModal from "./SideBarComponents/CreateJobModal";

type ContentBoxProps = {
  setSelectedJob: React.Dispatch<React.SetStateAction<Job | undefined>>;
  jobDetail: Job | undefined;
};

export default function ContentBox({
  setSelectedJob,
  jobDetail,
}: ContentBoxProps) {
  const { setAlert } = useAlert();
  const { downloadFile, deleteJob } = useJobs();
  const translation = useAppTranslation();
  const { locale } = useLocalization();
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [initialFiles, setInitialFiles] = useState<File[]>([]);

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
      setAlert(translation("alertDownloadFailed"), "error");
    } finally {
      setDownloadLoading(false);
    }
  }

  function closeDeleteConfirm() {
    if (deleteLoading) {
      return;
    }
    setDeleteConfirmOpen(false);
  }

  async function onDeleteConfirm() {
    if (!jobDetail || deleteLoading) {
      return;
    }
    setDeleteLoading(true);
    const success = await deleteJob(jobDetail);
    if (success) {
      setAlert(translation("alertJobDeleted"), "success");
      setSelectedJob(undefined);
      setDeleteConfirmOpen(false);
    } else {
      setAlert(translation("alertDeleteFailed"), "error");
    }
    setDeleteLoading(false);
  }

  if (!jobDetail) {
    return (
      <>
        <div className="flex h-full min-h-[50vh] items-center justify-center p-6">
          <div className="w-full max-w-xl">
            <AudioDropzone
              onFilesAdded={(files) => {
                setInitialFiles(files);
                setCreateOpen(true);
              }}
            />
          </div>
        </div>
        <CreateJobModal
          isOpen={createOpen}
          setOpen={setCreateOpen}
          initialFiles={initialFiles}
          onInitialFilesConsumed={() => setInitialFiles([])}
        />
      </>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 rounded-2xl border border-divider bg-surface p-6 text-on-surface shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-description">
              {translation("name")}
            </div>
            <h2 className="text-xl font-semibold">{jobDetail.name}</h2>
          </div>
          <StatusChip status={jobDetail.status} size="sm" />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-description">
              {translation("model")}
            </div>
            <div>{jobDetail.model || "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-description">
              {translation("language")}
            </div>
            <div>{languageLabel(jobDetail.language, translation)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-description">
              {translation("participants")}
            </div>
            <div>
              {jobDetail.participants
                ? jobDetail.participants
                : translation("auto")}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-description">
              {translation("created")}
            </div>
            <div>{formatDateTime(jobDetail.createdAt, locale)}</div>
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
            {translation("download")}
          </Button>
          {jobDetail.status !== "RUNNING" ? (
            <Button
              color="negative"
              coloringStyle="outline"
              disabled={deleteLoading}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              {translation("delete")}
            </Button>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        titleElement={translation("deleteConfirmTitle")}
        description={translation("deleteConfirmDescription", {
          name: jobDetail.name,
        })}
        isModal
        position="center"
        confirmType="negative"
        onCancel={closeDeleteConfirm}
        onConfirm={onDeleteConfirm}
        buttonOverwrites={[
          {
            text: translation("cancel"),
            disabled: deleteLoading,
          },
          {},
          {
            text: translation("delete"),
            disabled: deleteLoading,
          },
        ]}
      />
    </div>
  );
}
