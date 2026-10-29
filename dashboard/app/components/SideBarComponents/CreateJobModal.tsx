"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, Input, LabelledCheckbox } from "@helpwave/hightide";
import { FileAudio, Trash2 } from "lucide-react";
import useJobs from "../../hooks/useJob";
import useModels from "../../hooks/useModels";
import useAlert from "../../hooks/useAlert";
import useAppTranslation from "../../hooks/useAppTranslation";
import { useFeatures } from "../../context/FeaturesContext";
import { BulkFileEntry } from "../../types/types";
import { fileBaseName, formatFileSize } from "../../utils/file";
import { jobNameConflict, nextUniqueJobName } from "../../utils/jobName";
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
  const { createJob, jobs } = useJobs();
  const { models } = useModels();
  const { setAlert } = useAlert();
  const translation = useAppTranslation();
  const { mailEnabled } = useFeatures();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<BulkFileEntry[]>([]);
  const [jobName, setJobName] = useState("");
  const [model, setModel] = useState("");
  const [participants, setParticipants] = useState(0);
  const [language, setLanguage] = useState("");
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const defaultModel = models[0]?.model ?? "";

  const existingNames = useMemo(
    () => new Set((jobs ?? []).map((job) => job.name)),
    [jobs]
  );

  const nameConflict = jobNameConflict(jobName, existingNames);

  const canSubmit = useMemo(() => {
    if (models.length === 0 || entries.length === 0 || !jobName.trim()) {
      return false;
    }
    if (nameConflict) {
      return false;
    }
    return Boolean(model || defaultModel);
  }, [defaultModel, entries.length, jobName, model, models.length, nameConflict]);

  function close() {
    setOpen(false);
    setBusy(false);
    setEntries([]);
    setJobName("");
    setModel("");
    setParticipants(0);
    setLanguage("");
    setNotifyEnabled(true);
  }

  function takeUniqueFiles(
    incoming: File[],
    existing: BulkFileEntry[]
  ): { accepted: File[]; skipped: string[] } {
    const used = new Set(existing.map((entry) => entry.file.name));
    const accepted: File[] = [];
    const skipped: string[] = [];
    for (const file of incoming) {
      if (used.has(file.name)) {
        skipped.push(file.name);
        continue;
      }
      used.add(file.name);
      accepted.push(file);
    }
    return { accepted, skipped };
  }

  function seedEntriesFromFiles(files: File[]) {
    const selectedModel = model || defaultModel;
    const { accepted, skipped } = takeUniqueFiles(files, []);
    if (skipped.length > 0) {
      setAlert(
        translation("alertDuplicateFiles", {
          names: Array.from(new Set(skipped)).join(", "),
        }),
        "error"
      );
    }
    if (accepted.length === 0) {
      return;
    }
    const seeded: BulkFileEntry[] = accepted.map((file) => ({
      file,
      model: selectedModel,
      participants,
      language,
    }));
    const base = (seeded[0] ? fileBaseName(seeded[0].file) : "") || "job";
    setJobName(nextUniqueJobName(base, existingNames));
    if (!model) {
      setModel(selectedModel);
    }
    setEntries(seeded);
  }

  function onFilesAdded(files: File[]) {
    const selectedModel = model || defaultModel;
    const { accepted, skipped } = takeUniqueFiles(files, entries);
    if (skipped.length > 0) {
      setAlert(
        translation("alertDuplicateFiles", {
          names: Array.from(new Set(skipped)).join(", "),
        }),
        "error"
      );
    }
    if (accepted.length === 0) {
      return;
    }
    const merged: BulkFileEntry[] = [
      ...entries,
      ...accepted.map((file) => ({
        file,
        model: selectedModel,
        participants,
        language,
      })),
    ];
    if (!jobName.trim() && merged[0]) {
      setJobName(nextUniqueJobName(fileBaseName(merged[0].file), existingNames));
    }
    if (!model) {
      setModel(selectedModel);
    }
    setEntries(merged);
  }

  useEffect(() => {
    if (!isOpen || initialFiles.length === 0) {
      return;
    }
    seedEntriesFromFiles(initialFiles);
    onInitialFilesConsumed?.();
  }, [initialFiles, isOpen]);

  useEffect(() => {
    if (!isOpen || !mailEnabled) {
      return;
    }
    let cancelled = false;
    fetch("/api/settings/notifications")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.settings) {
          setNotifyEnabled(Boolean(data.settings.notifyOnFinish));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isOpen, mailEnabled]);

  async function onSubmit() {
    setBusy(true);
    try {
      const created = await createJob({
        name: jobName.trim(),
        model: model || defaultModel,
        participants,
        language,
        ...(mailEnabled ? { notifyEnabled } : {}),
        entries,
      });
      setAlert(translation("alertJobCreated"), "success");
      close();
      if (created.publicId) {
        router.push(`/job/${created.publicId}`);
      }
    } catch (error) {
      console.error(error);
      setAlert(translation("alertCreateFailed"), "error");
      setBusy(false);
    }
  }

  const single = entries.length === 1 ? entries[0] : undefined;

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
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <div className="text-xs text-description">
                {translation("jobName")}
              </div>
              <Input
                value={jobName}
                onValueChange={setJobName}
                placeholder={translation("jobName")}
                required
                invalid={nameConflict !== null}
              />
              {nameConflict ? (
                <p className="text-xs text-negative">
                  {translation("jobNameTaken")}
                </p>
              ) : null}
            </div>

            {single ? (
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
                  onClick={() => setEntries([])}
                  aria-label={translation("remove")}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ) : (
              <BulkFileTable
                entries={entries}
                models={models}
                onChange={setEntries}
                sharedLanguage={language}
                sharedParticipants={participants}
                onSharedLanguageChange={setLanguage}
                onSharedParticipantsChange={setParticipants}
              />
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <ModelSelect
                value={model || defaultModel}
                models={models}
                onChange={setModel}
                showLabel
              />
              {single ? (
                <>
                  <ParticipantsInput
                    value={participants}
                    onChange={setParticipants}
                    showLabel
                  />
                  <div className="md:col-span-2">
                    <div className="mb-1 text-xs text-description">
                      {translation("language")}
                    </div>
                    <LanguageToggle
                      value={language}
                      onChange={setLanguage}
                    />
                  </div>
                </>
              ) : null}
            </div>

            {mailEnabled ? (
              <LabelledCheckbox
                checkPosition="left"
                size="md"
                label={translation("notifyMe")}
                value={notifyEnabled}
                onValueChange={setNotifyEnabled}
              />
            ) : null}
          </div>
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
              {translation("createJob")}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
