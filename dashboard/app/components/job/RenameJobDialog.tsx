"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, Input } from "@helpwave/hightide";
import { Job } from "../../types/types";
import useAppTranslation from "../../hooks/useAppTranslation";
import useAlert from "../../hooks/useAlert";
import useJobs from "../../hooks/useJob";
import { jobNameConflict } from "../../utils/jobName";

type Props = {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (job: Job) => void;
};

export default function RenameJobDialog({
  job,
  isOpen,
  onClose,
  onUpdated,
}: Props) {
  const translation = useAppTranslation();
  const { setAlert } = useAlert();
  const { jobs, updateJob } = useJobs();
  const [name, setName] = useState(job.name);
  const [busy, setBusy] = useState(false);
  const [serverConflict, setServerConflict] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(job.name);
      setServerConflict(false);
    }
  }, [isOpen, job.name]);

  const existingNames = useMemo(() => {
    const names = new Set(
      (jobs ?? [])
        .filter((item) => item.publicId !== job.publicId)
        .map((item) => item.name)
    );
    return names;
  }, [job.publicId, jobs]);

  const trimmed = name.trim();
  const localConflict = jobNameConflict(trimmed, existingNames) !== null;
  const nameConflict = localConflict || serverConflict;
  const unchanged = trimmed === job.name;
  const canSave = trimmed.length > 0 && !nameConflict && !busy;

  async function onSave() {
    if (!canSave) {
      return;
    }
    if (unchanged) {
      onClose();
      return;
    }
    setBusy(true);
    setServerConflict(false);
    try {
      const updated = await updateJob(job.publicId, { name: trimmed });
      onUpdated?.(updated);
      setAlert(translation("alertJobRenamed"), "success");
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "Name taken") {
        setServerConflict(true);
      } else {
        setAlert(translation("alertRenameFailed"), "error");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!busy) {
          onClose();
        }
      }}
      titleElement={translation("renameJobTitle")}
      description={translation("renameJobDescription")}
      isModal
      position="center"
      className="max-w-md w-full"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-xs text-description">
            {translation("jobName")}
          </div>
          <Input
            value={name}
            onValueChange={(value) => {
              setName(value);
              setServerConflict(false);
            }}
            placeholder={translation("jobName")}
            required
            invalid={nameConflict}
            disabled={busy}
          />
          {nameConflict ? (
            <p className="text-xs text-negative">
              {translation("jobNameTaken")}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            coloringStyle="outline"
            color="primary"
            disabled={busy}
            onClick={onClose}
          >
            {translation("cancel")}
          </Button>
          <Button
            color="primary"
            isProcessing={busy}
            disabled={!canSave}
            onClick={() => {
              void onSave();
            }}
          >
            {translation("save")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
