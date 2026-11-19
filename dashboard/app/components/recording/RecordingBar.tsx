"use client";

import { useEffect } from "react";
import { Button } from "@helpwave/hightide";
import { Mic, MicOff, Square, Trash2 } from "lucide-react";
import useAppTranslation from "../../hooks/useAppTranslation";
import { useRecording } from "../../hooks/useRecording";
import { formatTimestamp } from "../../utils/date";
import LevelMeter from "./LevelMeter";

export default function RecordingBar() {
  const translation = useAppTranslation();
  const {
    status,
    stopAndTranscribe,
    discard,
    setMicMuted,
    busy,
  } = useRecording();

  const active =
    status.state === "recording" ||
    status.state === "stopping" ||
    status.state === "error";

  useEffect(() => {
    if (!active) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [active]);

  if (!active) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-divider bg-surface px-4 py-3 shadow-lg sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="relative flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-negative opacity-60" />
            <span className="relative inline-flex size-3 rounded-full bg-negative" />
          </span>
          <div className="font-mono text-sm tabular-nums">
            {formatTimestamp(status.elapsedSeconds)}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <LevelMeter
            analyser={status.displayAnalyser}
            label={translation("recordSourceMeeting")}
          />
          <LevelMeter
            analyser={status.micAnalyser}
            label={translation("recordSourceMic")}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {status.pendingUploads > 0 ? (
            <span className="text-xs text-description">
              {translation("recordPendingUploads", {
                count: status.pendingUploads,
              })}
            </span>
          ) : null}
          <Button
            coloringStyle="text"
            size="sm"
            onClick={() => setMicMuted(!status.micMuted)}
            disabled={busy || !status.micAnalyser}
            aria-label={
              status.micMuted
                ? translation("recordUnmuteMic")
                : translation("recordMuteMic")
            }
          >
            {status.micMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </Button>
          <Button
            color="negative"
            coloringStyle="text"
            size="sm"
            onClick={() => void discard()}
            disabled={busy}
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">
              {translation("recordDiscard")}
            </span>
          </Button>
          <Button
            color="primary"
            size="sm"
            isProcessing={busy || status.state === "stopping"}
            disabled={busy}
            onClick={() => void stopAndTranscribe()}
          >
            <Square size={14} />
            {translation("recordStopTranscribe")}
          </Button>
        </div>
      </div>
    </div>
  );
}
