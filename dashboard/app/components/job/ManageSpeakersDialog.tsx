"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, ConfirmDialog, Dialog, Input } from "@helpwave/hightide";
import { Job, TranscriptSegment } from "../../types/types";
import useAppTranslation from "../../hooks/useAppTranslation";
import useAlert from "../../hooks/useAlert";
import useJobs from "../../hooks/useJob";
import {
  collectSpeakerIds,
  detectSpeakerMerges,
  normalizeSpeakerNames,
  SpeakerNames,
} from "../../utils/transcript";

type Props = {
  job: Job;
  fileId: string;
  segments: TranscriptSegment[];
  speakerNames: SpeakerNames | null | undefined;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (job: Job) => void;
};

function draftsFromMapping(
  speakerIds: string[],
  mapping: SpeakerNames | null | undefined
): SpeakerNames {
  const drafts: SpeakerNames = {};
  for (const id of speakerIds) {
    drafts[id] = mapping?.[id] ?? id;
  }
  return drafts;
}

export default function ManageSpeakersDialog({
  job,
  fileId,
  segments,
  speakerNames,
  isOpen,
  onClose,
  onUpdated,
}: Props) {
  const translation = useAppTranslation();
  const { setAlert } = useAlert();
  const { updateFileSpeakerNames } = useJobs();
  const speakerIds = useMemo(
    () => collectSpeakerIds(segments),
    [segments]
  );
  const [drafts, setDrafts] = useState<SpeakerNames>(() =>
    draftsFromMapping(speakerIds, speakerNames)
  );
  const [busy, setBusy] = useState(false);
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false);
  const [pendingMapping, setPendingMapping] = useState<SpeakerNames | null>(
    null
  );
  const [mergeSummary, setMergeSummary] = useState<{
    count: number;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDrafts(draftsFromMapping(speakerIds, speakerNames));
      setPendingMapping(null);
      setMergeSummary(null);
      setMergeConfirmOpen(false);
    }
  }, [isOpen, speakerIds, speakerNames]);

  async function persist(mapping: SpeakerNames) {
    setBusy(true);
    try {
      const updated = await updateFileSpeakerNames(
        job.publicId,
        fileId,
        mapping
      );
      onUpdated?.(updated);
      setAlert(translation("alertSpeakerNamesSaved"), "success");
      setMergeConfirmOpen(false);
      onClose();
    } catch {
      setAlert(translation("alertSpeakerNamesFailed"), "error");
    } finally {
      setBusy(false);
      setPendingMapping(null);
    }
  }

  async function onSave() {
    const mapping = normalizeSpeakerNames(drafts);
    const merges = detectSpeakerMerges(mapping);
    if (merges.length > 0) {
      const first = merges[0] ?? [];
      const label = first[0] ? mapping[first[0]] : "";
      setPendingMapping(mapping);
      setMergeSummary({
        count: first.length,
        name: label || "—",
      });
      setMergeConfirmOpen(true);
      return;
    }
    await persist(mapping);
  }

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        titleElement={translation("manageSpeakers")}
        description={translation("manageSpeakersDescription")}
        isModal
        position="center"
        className="max-w-md w-full"
      >
        <div className="flex flex-col gap-4">
          <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
            {speakerIds.map((id) => (
              <div key={id} className="flex flex-col gap-1">
                <div className="text-xs uppercase tracking-wide text-description">
                  {id}
                </div>
                <Input
                  value={drafts[id] ?? id}
                  onValueChange={(value) =>
                    setDrafts((current) => ({ ...current, [id]: value }))
                  }
                  disabled={busy}
                />
              </div>
            ))}
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
              disabled={busy || speakerIds.length === 0}
              onClick={() => {
                void onSave();
              }}
            >
              {translation("saveSpeakerNames")}
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        description={
          mergeSummary
            ? translation("speakerMergeWarningDescription", mergeSummary)
            : ""
        }
        isModal
        isOpen={mergeConfirmOpen}
        onCancel={() => {
          if (!busy) {
            setMergeConfirmOpen(false);
            setPendingMapping(null);
          }
        }}
        onConfirm={() => {
          if (pendingMapping) {
            void persist(pendingMapping);
          }
        }}
        titleElement={translation("speakerMergeWarningTitle")}
        confirmType="negative"
      />
    </>
  );
}
