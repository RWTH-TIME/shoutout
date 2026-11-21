"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import useAlert from "../hooks/useAlert";
import useAppTranslation from "../hooks/useAppTranslation";
import {
  RecordingEngine,
  type RecordingEngineStatus,
} from "../utils/recording/recordingEngine";
import {
  DisplayAudioUnavailableError,
  captureDisplayAudio,
  captureMicrophone,
  stopStream,
} from "../utils/recording/captureSources";
import {
  extensionForMimeType,
  pickRecorderMimeType,
  supportsDisplayAudio,
  supportsMediaRecorder,
} from "../utils/recording/mediaSupport";
import type { Job } from "../types/types";
import RecoveryPrompt from "../components/recording/RecoveryPrompt";

export type StartRecordingInput = {
  name: string;
  model: string;
  participants?: number;
  language?: string;
  notifyEnabled?: boolean;
  includeDisplay: boolean;
  includeMic: boolean;
  micDeviceId?: string;
};

type RecordingContextValue = {
  status: RecordingEngineStatus;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  busy: boolean;
  supportsDisplay: boolean;
  supportsRecorder: boolean;
  startRecording: (input: StartRecordingInput) => Promise<void>;
  stopAndTranscribe: () => Promise<void>;
  discard: () => Promise<void>;
  setMicMuted: (muted: boolean) => void;
};

const idleStatus: RecordingEngineStatus = {
  state: "idle",
  publicId: null,
  startedAt: null,
  elapsedSeconds: 0,
  pendingUploads: 0,
  micMuted: false,
  error: null,
  displayAnalyser: null,
  micAnalyser: null,
};

export const RecordingContext = createContext<RecordingContextValue | null>(
  null
);

export function RecordingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const engineRef = useRef<RecordingEngine | null>(null);
  const [status, setStatus] = useState<RecordingEngineStatus>(idleStatus);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [supportsDisplay, setSupportsDisplay] = useState(false);
  const [supportsRecorder, setSupportsRecorder] = useState(false);
  const { setAlert } = useAlert();
  const translation = useAppTranslation();
  const { mutate } = useSWRConfig();
  const router = useRouter();

  const refreshJobs = useCallback(async () => {
    await mutate("/api/job/");
  }, [mutate]);

  useEffect(() => {
    setSupportsDisplay(supportsDisplayAudio());
    setSupportsRecorder(supportsMediaRecorder());
    const engine = new RecordingEngine();
    engineRef.current = engine;
    const unsubscribe = engine.subscribe(setStatus);
    return () => {
      unsubscribe();
      engineRef.current = null;
    };
  }, []);

  const startRecording = useCallback(
    async (input: StartRecordingInput) => {
      const engine = engineRef.current;
      if (!engine) {
        return;
      }
      if (!supportsMediaRecorder()) {
        setAlert(translation("recordUnsupported"), "error");
        return;
      }
      if (!input.includeDisplay && !input.includeMic) {
        setAlert(translation("recordNeedSource"), "error");
        return;
      }

      setBusy(true);
      let displayStream: MediaStream | null = null;
      let micStream: MediaStream | null = null;
      let displayHasAudio = false;

      try {
        if (input.includeDisplay) {
          try {
            const capture = await captureDisplayAudio();
            displayStream = capture.stream;
            displayHasAudio = capture.hasAudio;
          } catch (error) {
            if (error instanceof DisplayAudioUnavailableError) {
              throw new Error(translation("recordSelectShareAudio"));
            }
            throw error;
          }
        }
        if (input.includeMic) {
          micStream = await captureMicrophone(input.micDeviceId);
        }

        if (displayStream && !displayHasAudio && !micStream) {
          stopStream(displayStream);
          displayStream = null;
          throw new Error(translation("recordSelectShareAudio"));
        }

        const usedMicFallback = Boolean(
          displayStream && !displayHasAudio && micStream
        );

        const mimeType = pickRecorderMimeType();
        const extension = extensionForMimeType(mimeType);
        const originalName = `${input.name.trim() || "recording"}${extension}`;

        const response = await fetch("/api/recordings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: input.name.trim(),
            model: input.model,
            participants: input.participants,
            language: input.language,
            notifyEnabled: input.notifyEnabled,
            extension,
            originalName,
            mimeType,
          }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? "Could not start recording");
        }
        const data = (await response.json()) as { job: Job };
        const job = data.job;

        await engine.start({
          publicId: job.publicId,
          jobName: job.name,
          displayStream,
          micStream,
          mimeType,
        });

        await mutate(
          "/api/job/",
          (current: Job[] | undefined) =>
            current ? [job, ...current] : [job],
          { revalidate: false }
        );
        await refreshJobs();
        setDialogOpen(false);
        if (usedMicFallback) {
          setAlert(translation("recordDisplayAudioFallback"), "warning");
        } else {
          setAlert(translation("alertRecordingStarted"), "success");
        }
        router.push(`/job/${job.publicId}`);
      } catch (error) {
        stopStream(displayStream);
        stopStream(micStream);
        console.error(error);
        setAlert(
          error instanceof Error
            ? error.message
            : translation("alertRecordingFailed"),
          "error"
        );
      } finally {
        setBusy(false);
      }
    },
    [mutate, refreshJobs, router, setAlert, translation]
  );

  const stopAndTranscribe = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }
    setBusy(true);
    try {
      const { chunkCount, durationSeconds } = await engine.stop();
      if (chunkCount <= 0) {
        throw new Error(translation("alertRecordingFailed"));
      }
      await engine.finishRemote(chunkCount, durationSeconds);
      setAlert(translation("alertRecordingFinished"), "success");
      await refreshJobs();
    } catch (error) {
      console.error(error);
      setAlert(
        error instanceof Error
          ? error.message
          : translation("alertRecordingFailed"),
        "error"
      );
    } finally {
      setBusy(false);
    }
  }, [refreshJobs, setAlert, translation]);

  const discard = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }
    setBusy(true);
    try {
      await engine.discardRemote();
      setAlert(translation("alertRecordingDiscarded"), "success");
      await refreshJobs();
    } catch (error) {
      console.error(error);
      setAlert(translation("alertRecordingFailed"), "error");
    } finally {
      setBusy(false);
    }
  }, [refreshJobs, setAlert, translation]);

  const setMicMuted = useCallback((muted: boolean) => {
    engineRef.current?.setMicMuted(muted);
  }, []);

  const value = useMemo<RecordingContextValue>(
    () => ({
      status,
      dialogOpen,
      setDialogOpen,
      busy,
      supportsDisplay,
      supportsRecorder,
      startRecording,
      stopAndTranscribe,
      discard,
      setMicMuted,
    }),
    [
      status,
      dialogOpen,
      busy,
      supportsDisplay,
      supportsRecorder,
      startRecording,
      stopAndTranscribe,
      discard,
      setMicMuted,
    ]
  );

  return (
    <RecordingContext.Provider value={value}>
      {children}
      <RecoveryPrompt
        activePublicId={status.publicId}
        engineIdle={status.state === "idle"}
      />
    </RecordingContext.Provider>
  );
}
