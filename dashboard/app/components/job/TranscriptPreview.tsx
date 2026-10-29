"use client";

import { TranscriptSegment } from "../../types/types";
import { formatTimestamp } from "../../utils/date";
import { speakerColorClass } from "../../utils/transcript";
import useAppTranslation from "../../hooks/useAppTranslation";

type Props = {
  segments: TranscriptSegment[] | null;
  rawSpeakers?: string[] | null;
  loading?: boolean;
  currentTime?: number;
  onSeek?: (seconds: number) => void;
};

export default function TranscriptPreview({
  segments,
  rawSpeakers = null,
  loading = false,
  currentTime = 0,
  onSeek,
}: Props) {
  const translation = useAppTranslation();
  const colorMap = new Map<string, number>();

  if (loading) {
    return (
      <div className="rounded-xl border border-divider p-4 text-sm text-description">
        {translation("loading")}
      </div>
    );
  }

  if (!segments || segments.length === 0) {
    return (
      <div className="rounded-xl border border-divider p-4 text-sm text-description">
        {translation("noTranscriptYet")}
      </div>
    );
  }

  return (
    <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto rounded-xl border border-divider p-3">
      {segments.map((segment, index) => {
        const active =
          currentTime >= segment.start && currentTime < segment.end;
        const colorKey = rawSpeakers?.[index] ?? segment.speaker;
        return (
          <button
            key={`${segment.start}-${index}`}
            type="button"
            onClick={() => onSeek?.(segment.start)}
            className={`cursor-pointer rounded-lg border-l-4 px-3 py-2 text-left transition ${speakerColorClass(
              colorKey,
              colorMap
            )} ${active ? "ring-1 ring-primary" : "hover:bg-surface-hover"}`}
          >
            <div className="mb-1 flex items-center gap-2 text-xs text-description">
              <span className="font-medium text-on-surface">
                {segment.speaker}
              </span>
              <span>{formatTimestamp(segment.start)}</span>
            </div>
            <div className="text-sm leading-relaxed">{segment.text}</div>
          </button>
        );
      })}
    </div>
  );
}
