"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, Input, LabelledCheckbox } from "@helpwave/hightide";
import useModels from "../../hooks/useModels";
import useJobs from "../../hooks/useJob";
import useAppTranslation from "../../hooks/useAppTranslation";
import { useFeatures } from "../../context/FeaturesContext";
import { useRecording } from "../../hooks/useRecording";
import { jobNameConflict, nextUniqueJobName } from "../../utils/jobName";
import { listMicrophones, type MicrophoneDevice } from "../../utils/recording/captureSources";
import LanguageToggle from "../jobs/LanguageToggle";
import ModelSelect from "../jobs/ModelSelect";
import ParticipantsInput from "../jobs/ParticipantsInput";

export default function RecordingDialog() {
  const translation = useAppTranslation();
  const { models } = useModels();
  const { jobs } = useJobs();
  const { mailEnabled } = useFeatures();
  const {
    dialogOpen,
    setDialogOpen,
    startRecording,
    busy,
    supportsDisplay,
    supportsRecorder,
  } = useRecording();

  const [jobName, setJobName] = useState("");
  const [model, setModel] = useState("");
  const [participants, setParticipants] = useState(0);
  const [language, setLanguage] = useState("");
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [includeDisplay, setIncludeDisplay] = useState(true);
  const [includeMic, setIncludeMic] = useState(true);
  const [micDeviceId, setMicDeviceId] = useState("");
  const [mics, setMics] = useState<MicrophoneDevice[]>([]);

  const defaultModel = models[0]?.model ?? "";
  const existingNames = useMemo(
    () => new Set((jobs ?? []).map((job) => job.name)),
    [jobs]
  );
  const nameConflict = jobNameConflict(jobName, existingNames);

  const canSubmit = useMemo(() => {
    if (!supportsRecorder || models.length === 0 || !jobName.trim()) {
      return false;
    }
    if (nameConflict) {
      return false;
    }
    if (!includeDisplay && !includeMic) {
      return false;
    }
    if (includeDisplay && !supportsDisplay) {
      return false;
    }
    return Boolean(model || defaultModel);
  }, [
    supportsRecorder,
    models.length,
    jobName,
    nameConflict,
    includeDisplay,
    includeMic,
    supportsDisplay,
    model,
    defaultModel,
  ]);

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }
    setIncludeDisplay(supportsDisplay);
    setIncludeMic(true);
    if (!jobName.trim()) {
      setJobName(nextUniqueJobName("meeting", existingNames));
    }
    if (!model && defaultModel) {
      setModel(defaultModel);
    }
    listMicrophones()
      .then((devices) => {
        setMics(devices);
        if (devices[0] && !micDeviceId) {
          setMicDeviceId(devices[0].deviceId);
        }
      })
      .catch(() => undefined);
  }, [dialogOpen]);

  useEffect(() => {
    if (!dialogOpen || !mailEnabled) {
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
  }, [dialogOpen, mailEnabled]);

  function close() {
    if (busy) {
      return;
    }
    setDialogOpen(false);
    setJobName("");
    setModel("");
    setParticipants(0);
    setLanguage("");
    setNotifyEnabled(true);
    setIncludeDisplay(supportsDisplay);
    setIncludeMic(true);
  }

  async function onStart() {
    await startRecording({
      name: jobName.trim(),
      model: model || defaultModel,
      participants,
      language,
      ...(mailEnabled ? { notifyEnabled } : {}),
      includeDisplay: includeDisplay && supportsDisplay,
      includeMic,
      micDeviceId: micDeviceId || undefined,
    });
  }

  return (
    <Dialog
      isOpen={dialogOpen}
      onClose={close}
      titleElement={translation("recordMeetingTitle")}
      description={translation("recordMeetingDescription")}
      isModal
      position="center"
      className="max-w-xl w-full"
    >
      <div className="flex flex-col gap-4">
        {!supportsRecorder ? (
          <div className="rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
            {translation("recordUnsupported")}
          </div>
        ) : null}

        {models.length === 0 ? (
          <div className="rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
            {translation("noWorkers")}
          </div>
        ) : null}

        <div className="rounded-lg border border-divider bg-surface px-3 py-2 text-sm text-description">
          {supportsDisplay
            ? translation("recordSupportNotice")
            : translation("recordSupportLimited")}
        </div>

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

        <div className="flex flex-col gap-2">
          <LabelledCheckbox
            checkPosition="left"
            size="md"
            label={translation("recordSourceMeeting")}
            value={includeDisplay && supportsDisplay}
            onValueChange={setIncludeDisplay}
            disabled={!supportsDisplay}
          />
          <LabelledCheckbox
            checkPosition="left"
            size="md"
            label={translation("recordSourceMic")}
            value={includeMic}
            onValueChange={setIncludeMic}
          />
          {includeMic && mics.length > 0 ? (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-description">
                {translation("recordMicDevice")}
              </span>
              <select
                className="rounded-lg border border-divider bg-surface px-3 py-2 text-sm"
                value={micDeviceId}
                onChange={(event) => setMicDeviceId(event.target.value)}
              >
                {mics.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <ParticipantsInput
          value={participants}
          onChange={setParticipants}
          showLabel
        />
        <ModelSelect
          value={model || defaultModel}
          models={models}
          onChange={setModel}
          showLabel
        />
        <div>
          <div className="mb-1 text-xs text-description">
            {translation("language")}
          </div>
          <LanguageToggle value={language} onChange={setLanguage} />
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

        <div className="flex justify-end gap-2 border-t border-divider pt-3">
          <Button coloringStyle="text" onClick={close} disabled={busy}>
            {translation("cancel")}
          </Button>
          <Button
            color="primary"
            isProcessing={busy}
            disabled={!canSubmit || busy}
            onClick={() => void onStart()}
          >
            {translation("recordStart")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
