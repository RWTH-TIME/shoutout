"use client";

import { useState } from "react";
import { Button, ConfirmDialog } from "@helpwave/hightide";
import { Share2 } from "lucide-react";
import { Job } from "../../types/types";
import useAppTranslation from "../../hooks/useAppTranslation";
import useAlert from "../../hooks/useAlert";
import useJobs from "../../hooks/useJob";
import StatusChip from "../StatusChip";
import VisibilityIcon from "./VisibilityIcon";
import ShareDialog from "./ShareDialog";

type Props = {
  job: Job;
  canManage: boolean;
  onUpdated?: (job: Job) => void;
  onDeleted?: () => void;
};

export default function JobHeader({
  job,
  canManage,
  onUpdated,
  onDeleted,
}: Props) {
  const translation = useAppTranslation();
  const { setAlert } = useAlert();
  const { downloadFile, deleteJob, updateJob } = useJobs();
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [notifyBusy, setNotifyBusy] = useState(false);

  async function onDownload() {
    if (job.status !== "FINISHED") {
      return;
    }
    try {
      setDownloadLoading(true);
      const link = document.createElement("a");
      link.href = await downloadFile(job);
      link.click();
    } catch (error) {
      console.error("Error downloading file", error);
      setAlert(translation("alertDownloadFailed"), "error");
    } finally {
      setDownloadLoading(false);
    }
  }

  async function onDeleteConfirm() {
    if (deleteLoading) {
      return;
    }
    setDeleteLoading(true);
    const success = await deleteJob(job);
    if (success) {
      setAlert(translation("alertJobDeleted"), "success");
      setDeleteConfirmOpen(false);
      onDeleted?.();
    } else {
      setAlert(translation("alertDeleteFailed"), "error");
    }
    setDeleteLoading(false);
  }

  async function onToggleNotify(checked: boolean) {
    setNotifyBusy(true);
    try {
      const updated = await updateJob(job.publicId, { notifyEnabled: checked });
      onUpdated?.(updated);
    } catch {
      setAlert(translation("alertSettingsFailed"), "error");
    } finally {
      setNotifyBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-description">
              {translation("name")}
            </div>
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-semibold">{job.name}</h2>
              <VisibilityIcon visibility={job.visibility} size={16} />
            </div>
          </div>
          <StatusChip status={job.status} size="sm" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            color="primary"
            isProcessing={downloadLoading}
            disabled={job.status !== "FINISHED" || downloadLoading}
            onClick={onDownload}
          >
            {translation("download")}
          </Button>
          {canManage ? (
            <>
              <Button
                coloringStyle="outline"
                color="primary"
                onClick={() => setShareOpen(true)}
              >
                <Share2 size={16} />
                <span className="ms-1">{translation("share")}</span>
              </Button>
              {job.status !== "RUNNING" ? (
                <Button
                  color="negative"
                  coloringStyle="outline"
                  disabled={deleteLoading}
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  {translation("delete")}
                </Button>
              ) : null}
              <label className="ms-auto flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(job.notifyEnabled)}
                  disabled={notifyBusy}
                  onChange={(event) => onToggleNotify(event.target.checked)}
                />
                {translation("notifyMe")}
              </label>
            </>
          ) : null}
        </div>
      </div>

      {canManage ? (
        <ShareDialog
          job={job}
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          onUpdated={onUpdated}
        />
      ) : null}

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        titleElement={translation("deleteConfirmTitle")}
        description={translation("deleteConfirmDescription", {
          name: job.name,
        })}
        isModal
        position="center"
        confirmType="negative"
        onCancel={() => {
          if (!deleteLoading) {
            setDeleteConfirmOpen(false);
          }
        }}
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
    </>
  );
}
