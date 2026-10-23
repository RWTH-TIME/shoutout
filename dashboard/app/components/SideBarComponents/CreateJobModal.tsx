"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, Input } from "@helpwave/hightide";
import { FileAudio, Trash2 } from "lucide-react";
import useJobs from "../../hooks/useJob";
import useModels from "../../hooks/useModels";
import useAlert from "../../hooks/useAlert";
import useAppTranslation from "../../hooks/useAppTranslation";
import { BulkFileEntry } from "../../types/types";
import { fileBaseName, formatFileSize } from "../../utils/file";
import {
  assignUniqueJobNames,
  jobNameConflict,
  uniqueJobNamesFromBase,
} from "../../utils/jobName";
import AudioDropzone from "../upload/AudioDropzone";
import LanguageToggle from "../jobs/LanguageToggle";
import ModelSelect from "../jobs/ModelSelect";
import ParticipantsInput from "../jobs/ParticipantsInput";
import BulkFileTable from "./BulkFileTable";

type ModalProps = {
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  initialFiles?: File[];
  onInitialFilesConsumed?: () => void;
};

export default function CreateJobModal({
  isOpen,
  setOpen,
  initialFiles = [],
  onInitialFilesConsumed,
}: ModalProps) {
  const { createJobs, jobs } = useJobs();
  const { models } = useModels();
  const { setAlert } = useAlert();
  const translation = useAppTranslation();
  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<BulkFileEntry[]>([]);
  const [baseJobName, setBaseJobName] = useState("");
  const defaultModel = models[0]?.model ?? "";

  const existingNames = useMemo(
    () => new Set((jobs ?? []).map((job) => job.name)),
    [jobs]
  );

  const batchNames = useMemo(
    () => entries.map((entry) => entry.name),
    [entries]
  );

  const nameConflicts = useMemo(
    () =>
      entries.map((entry, index) =>
        jobNameConflict(entry.name, existingNames, batchNames, index)
      ),
    [batchNames, entries, existingNames]
  );

  const hasNameConflict = nameConflicts.some((conflict) => conflict !== null);

  const canSubmit = useMemo(() => {
    if (models.length === 0 || entries.length === 0 || hasNameConflict) {
      return false;
    }
    return entries.every((entry) => entry.name.trim() && entry.model);
  }, [entries, hasNameConflict, models.length]);

  function close() {
    setOpen(false);
    setBusy(false);
    setEntries([]);
    setBaseJobName("");
  }

  function seedEntriesFromFiles(files: File[]) {
    const seeded: BulkFileEntry[] = files.map((file) => ({
      file,
      name: fileBaseName(file),
      model: defaultModel,
      participants: 0,
      language: "",
    }));
    const base = (seeded[0] ? fileBaseName(seeded[0].file) : "") || "job";
    if (seeded.length > 1) {
      setBaseJobName(base);
      const names = uniqueJobNamesFromBase(base, seeded.length, existingNames);
      setEntries(
        seeded.map((entry, index) => ({
          ...entry,
          name: names[index] ?? entry.name,
        }))
      );
      return;
    }
    const names = assignUniqueJobNames(
      seeded.map((entry) => entry.name),
      existingNames
    );
    setBaseJobName("");
    setEntries(
      seeded.map((entry, index) => ({
        ...entry,
        name: names[index] ?? entry.name,
      }))
    );
  }

  function onFilesAdded(files: File[]) {
    const merged: BulkFileEntry[] = [
      ...entries,
      ...files.map((file) => ({
        file,
        name: fileBaseName(file),
        model: defaultModel,
        participants: 0,
        language: "",
      })),
    ];
    const base =
      baseJobName.trim() ||
      (merged[0] ? fileBaseName(merged[0].file) : "") ||
      "job";
    if (merged.length > 1) {
      if (!baseJobName.trim()) {
        setBaseJobName(base);
      }
      const names = uniqueJobNamesFromBase(
        baseJobName.trim() || base,
        merged.length,
        existingNames
      );
      setEntries(
        merged.map((entry, index) => ({
          ...entry,
          name: names[index] ?? entry.name,
        }))
      );
      return;
    }
    const names = assignUniqueJobNames(
      merged.map((entry) => entry.name),
      existingNames
    );
    setEntries(
      merged.map((entry, index) => ({
        ...entry,
        name: names[index] ?? entry.name,
      }))
    );
  }

  useEffect(() => {
    if (!isOpen || initialFiles.length === 0) {
      return;
    }
    seedEntriesFromFiles(initialFiles);
    onInitialFilesConsumed?.();
  }, [initialFiles, isOpen]);

  function onEntriesChange(next: BulkFileEntry[]) {
    if (next.length <= 1) {
      setEntries(next);
      if (next.length === 0) {
        setBaseJobName("");
      }
      return;
    }
    const base =
      baseJobName.trim() ||
      (next[0] ? fileBaseName(next[0].file) : "") ||
      "job";
    if (!baseJobName.trim()) {
      setBaseJobName(base);
    }
    const names = uniqueJobNamesFromBase(
      baseJobName.trim() || base,
      next.length,
      existingNames
    );
    setEntries(
      next.map((entry, index) => ({
        ...entry,
        name: names[index] ?? entry.name,
      }))
    );
  }

  async function onSubmit() {
    setBusy(true);
    const results = await createJobs(entries);
    const failed = results.filter((item) => !item.ok);
    if (failed.length === 0) {
      setAlert(
        entries.length === 1
          ? translation("alertJobCreated")
          : translation("alertJobsCreated"),
        "success"
      );
      close();
      return;
    }
    setAlert(
      translation("alertJobsFailed", {
        failed: failed.length,
        total: results.length,
      }),
      "error"
    );
    setBusy(false);
  }

  const single = entries.length === 1 ? entries[0] : undefined;
  const singleConflict = single ? nameConflicts[0] : null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={close}
      titleElement={translation("createJob")}
      description={translation("createJobDescription")}
      isModal
      position="center"
      className={
        entries.length > 1 ? "max-w-5xl w-full" : "max-w-xl w-full"
      }
    >
      <div className="flex flex-col gap-4">
        {models.length === 0 ? (
          <div className="rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
            {translation("noWorkers")}
          </div>
        ) : null}

        {entries.length === 0 ? (
          <AudioDropzone onFilesAdded={onFilesAdded} />
        ) : single ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <div className="text-xs text-description">
                {translation("jobName")}
              </div>
              <Input
                value={single.name}
                onValueChange={(name) => setEntries([{ ...single, name }])}
                placeholder={translation("jobName")}
                required
                invalid={singleConflict !== null}
              />
              {singleConflict ? (
                <p className="text-xs text-negative">
                  {singleConflict === "taken"
                    ? translation("jobNameTaken")
                    : translation("jobNameDuplicate")}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-divider bg-surface px-3 py-2">
              <FileAudio size={20} className="shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{single.file.name}</div>
                <div className="text-xs text-description">
                  {formatFileSize(single.file.size)}
                </div>
              </div>
              <Button
                color="negative"
                coloringStyle="text"
                size="sm"
                onClick={() => {
                  setEntries([]);
                  setBaseJobName("");
                }}
                aria-label={translation("remove")}
              >
                <Trash2 size={16} />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <ModelSelect
                value={single.model}
                models={models}
                onChange={(model) => setEntries([{ ...single, model }])}
                showLabel
              />
              <ParticipantsInput
                value={single.participants}
                onChange={(participants) =>
                  setEntries([{ ...single, participants }])
                }
                showLabel
              />
              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-description">
                  {translation("language")}
                </div>
                <LanguageToggle
                  value={single.language}
                  onChange={(language) =>
                    setEntries([{ ...single, language }])
                  }
                />
              </div>
            </div>
          </div>
        ) : (
          <BulkFileTable
            entries={entries}
            models={models}
            onChange={onEntriesChange}
            existingNames={existingNames}
            baseJobName={baseJobName}
            onBaseJobNameChange={setBaseJobName}
          />
        )}

        <div className="flex flex-col gap-3 border-t border-divider pt-3">
          {entries.length > 0 ? (
            <div className="flex justify-start">
              <AudioDropzone onFilesAdded={onFilesAdded} compact />
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button coloringStyle="text" onClick={close}>
              {translation("cancel")}
            </Button>
            <Button
              color="primary"
              isProcessing={busy}
              disabled={!canSubmit || busy}
              onClick={onSubmit}
            >
              {entries.length > 1
                ? translation("createJobs", { count: entries.length })
                : translation("createJob")}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
