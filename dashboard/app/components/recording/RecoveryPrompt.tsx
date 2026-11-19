"use client";

import { useEffect, useState } from "react";
import { Button, Dialog } from "@helpwave/hightide";
import { useSWRConfig } from "swr";
import useAppTranslation from "../../hooks/useAppTranslation";
import useAlert from "../../hooks/useAlert";
import { RecordingEngine } from "../../utils/recording/recordingEngine";
import type { RecordingSession } from "../../utils/recording/recordingStore";

export default function RecoveryPrompt() {
  const translation = useAppTranslation();
  const { setAlert } = useAlert();
  const { mutate } = useSWRConfig();
  const [session, setSession] = useState<RecordingSession | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    RecordingEngine.listRecoverableSessions()
      .then((sessions) => {
        if (!cancelled && sessions[0]) {
          setSession(sessions[0]);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!session) {
    return null;
  }

  async function onRecover() {
    if (!session) {
      return;
    }
    setBusy(true);
    try {
      await RecordingEngine.recoverAndFinish(session.publicId);
      setAlert(translation("alertRecoveryDone"), "success");
      setSession(null);
      await mutate("/api/job/");
    } catch {
      setAlert(translation("alertRecoveryFailed"), "error");
      setBusy(false);
    }
  }

  async function onDiscard() {
    if (!session) {
      return;
    }
    setBusy(true);
    try {
      await RecordingEngine.discardSession(session.publicId);
      setAlert(translation("alertRecordingDiscarded"), "success");
      setSession(null);
      await mutate("/api/job/");
    } catch {
      setAlert(translation("alertRecoveryFailed"), "error");
      setBusy(false);
    }
  }

  return (
    <Dialog
      isOpen
      onClose={() => undefined}
      titleElement={translation("recoveryTitle")}
      description={translation("recoveryDescription", {
        name: session.jobName,
      })}
      isModal
      position="center"
      className="max-w-md w-full"
    >
      <div className="flex justify-end gap-2 pt-2">
        <Button
          coloringStyle="text"
          color="negative"
          disabled={busy}
          onClick={() => void onDiscard()}
        >
          {translation("recoveryDiscard")}
        </Button>
        <Button
          color="primary"
          isProcessing={busy}
          disabled={busy}
          onClick={() => void onRecover()}
        >
          {translation("recoveryUpload")}
        </Button>
      </div>
    </Dialog>
  );
}
