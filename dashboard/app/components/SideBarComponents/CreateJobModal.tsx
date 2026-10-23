"use client";

import { useMemo, useState } from "react";
import { Button, Dialog, Input, Select } from "@helpwave/hightide";
import useJobs from "../../hooks/useJob";
import useModels from "../../hooks/useModels";
import useAlert from "../../hooks/useAlert";
import { BulkFileEntry, Job, STATUS } from "../../types/types";
import BulkFileTable from "./BulkFileTable";
import { LANGUAGE_OPTIONS } from "../../utils/languages";

type ModalProps = {
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function CreateJobModal({ isOpen, setOpen }: ModalProps) {
  const { createJob, createJobs } = useJobs();
  const { models } = useModels();
  const { setAlert } = useAlert();
  const [bulkMode, setBulkMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const defaultModel = models[0]?.model ?? "";

  const [single, setSingle] = useState<Job>({
    name: "",
    audioFile: undefined,
    model: defaultModel,
    participants: 0,
    language: "",
    status: STATUS.Pending,
    createdAt: new Date(),
  });
  const [entries, setEntries] = useState<BulkFileEntry[]>([]);

  const canSubmit = useMemo(() => {
    if (models.length === 0) {
      return false;
    }
    if (bulkMode) {
      return (
        entries.length > 0 &&
        entries.every((entry) => entry.name && entry.model)
      );
    }
    return Boolean(
      single.name && single.model && single.audioFile instanceof File
    );
  }, [bulkMode, entries, models.length, single]);

  function close() {
    setOpen(false);
    setBusy(false);
    setEntries([]);
    setSingle({
      name: "",
      audioFile: undefined,
      model: models[0]?.model ?? "",
      participants: 0,
      language: "",
      status: STATUS.Pending,
      createdAt: new Date(),
    });
  }

  async function onSubmit() {
    setBusy(true);
    if (bulkMode) {
      const results = await createJobs(entries);
      const failed = results.filter((item) => !item.ok);
      if (failed.length === 0) {
        setAlert("Jobs created", "success");
        close();
      } else {
        setAlert(
          `${failed.length} of ${results.length} jobs failed`,
          "error"
        );
        setBusy(false);
      }
      return;
    }

    const ok = await createJob({
      ...single,
      model: single.model || defaultModel,
    });
    if (ok) {
      setAlert("Job created", "success");
      close();
    } else {
      setAlert("Could not create job", "error");
      setBusy(false);
    }
  }

  function onPickFiles(fileList: FileList | null) {
    if (!fileList) {
      return;
    }
    const files = Array.from(fileList);
    if (bulkMode) {
      setEntries(
        files.map((file) => ({
          file,
          name: file.name.replace(/\.[^.]+$/, ""),
          model: defaultModel,
          participants: 0,
          language: "",
        }))
      );
      return;
    }
    const file = files[0];
    if (!file) {
      return;
    }
    setSingle((current) => ({
      ...current,
      audioFile: file,
      name: current.name || file.name.replace(/\.[^.]+$/, ""),
      model: current.model || defaultModel,
    }));
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={close}
      titleElement="Create job"
      description="Upload audio and choose a model offered by attached workers."
      isModal
      position="center"
      containerClassName="max-w-4xl w-full"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={bulkMode}
              onChange={(event) => {
                setBulkMode(event.target.checked);
                setEntries([]);
              }}
            />
            Bulk file selection
          </label>
          {models.length === 0 ? (
            <span className="text-sm text-negative">
              No workers attached. Attach a worker to choose a model.
            </span>
          ) : null}
        </div>

        <input
          type="file"
          accept={bulkMode ? "audio/*" : "audio/*,.zip"}
          multiple={bulkMode}
          onChange={(event) => onPickFiles(event.target.files)}
        />

        {bulkMode ? (
          <BulkFileTable
            entries={entries}
            models={models}
            onChange={setEntries}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              value={single.name}
              onValueChange={(value) =>
                setSingle((current) => ({ ...current, name: value }))
              }
              placeholder="Name"
              required
            />
            <Select
              value={single.model || defaultModel || null}
              onValueChange={(value) =>
                setSingle((current) => ({
                  ...current,
                  model: value ?? "",
                }))
              }
              placeholder="Model"
            >
              {models.map((item) => (
                <Select.Option
                  key={item.model}
                  value={item.model}
                  label={`${item.model} (${item.workerCount} workers)`}
                />
              ))}
            </Select>
            <Input
              type="number"
              value={String(single.participants)}
              onValueChange={(value) =>
                setSingle((current) => ({
                  ...current,
                  participants: Number(value) || 0,
                }))
              }
              placeholder="Participants"
            />
            <Select
              value={single.language}
              onValueChange={(value) =>
                setSingle((current) => ({
                  ...current,
                  language: value ?? "",
                }))
              }
              placeholder="Language"
            >
              {LANGUAGE_OPTIONS.map((item) => (
                <Select.Option
                  key={item.value || "auto"}
                  value={item.value}
                  label={item.name}
                />
              ))}
            </Select>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button coloringStyle="text" onClick={close}>
            Cancel
          </Button>
          <Button
            color="primary"
            isProcessing={busy}
            disabled={!canSubmit || busy}
            onClick={onSubmit}
          >
            Create
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
