"use client";

import { useState } from "react";
import { Button, ConfirmDialog, LabelledCheckbox } from "@helpwave/hightide";
import { Download, Share2, Trash2 } from "lucide-react";
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
  const { deleteJob, updateJob } = useJobs();
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [notifyBusy, setNotifyBusy] = useState(false);

  async function onDownload() {
    if (job.status !== "FINISHED" || !job.publicId) {
      return;
    }
    try {
      setDownloadLoading(true);
      const link = document.createElement("a");
      link.href = `/api/jobs/${job.publicId}/download`;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
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
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-description">
              {translation("name")}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="truncate text-2xl font-semibold">{job.name}</h2>
              <VisibilityIcon visibility={job.visibility} size={18} />
            </div>
          </div>
          <StatusChip status={job.status} size="sm" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            color="primary"
            isProcessing={downloadLoading}
            disabled={job.status !== "FINISHED" || downloadLoading}
            onClick={onDownload}
          >
            <span className="inline-flex items-center gap-2">
              <Download size={16} aria-hidden />
              {translation("download")}
            </span>
          </Button>
          {canManage ? (
            <>
              <Button
                coloringStyle="outline"
                color="primary"
                onClick={() => setShareOpen(true)}
              >
                <span className="inline-flex items-center gap-2">
                  <Share2 size={16} aria-hidden />
                  {translation("share")}
                </span>
              </Button>
              {job.status !== "RUNNING" ? (
                <Button
                  color="negative"
                  coloringStyle="outline"
                  disabled={deleteLoading}
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <span className="inline-flex items-center gap-2">
                    <Trash2 size={16} aria-hidden />
                    {translation("delete")}
                  </span>
                </Button>
              ) : null}
              <LabelledCheckbox
                className="ms-auto"
                checkPosition="left"
                size="md"
                label={translation("notifyMe")}
                value={Boolean(job.notifyEnabled)}
                disabled={notifyBusy}
                onValueChange={onToggleNotify}
              />
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
