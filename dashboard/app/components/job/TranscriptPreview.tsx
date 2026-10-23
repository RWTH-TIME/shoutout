"use client";

import { TranscriptSegment } from "../../types/types";
import { formatTimestamp } from "../../utils/date";
import useAppTranslation from "../../hooks/useAppTranslation";

const SPEAKER_COLORS = [
  "border-l-blue-500 bg-blue-500/5",
  "border-l-emerald-500 bg-emerald-500/5",
  "border-l-amber-500 bg-amber-500/5",
  "border-l-violet-500 bg-violet-500/5",
  "border-l-rose-500 bg-rose-500/5",
  "border-l-cyan-500 bg-cyan-500/5",
];

type Props = {
  segments: TranscriptSegment[] | null;
  loading?: boolean;
  currentTime?: number;
  onSeek?: (seconds: number) => void;
};

function speakerColor(speaker: string, indexMap: Map<string, number>): string {
  if (!indexMap.has(speaker)) {
    indexMap.set(speaker, indexMap.size);
  }
  const index = indexMap.get(speaker) ?? 0;
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length] ?? SPEAKER_COLORS[0];
}

export default function TranscriptPreview({
  segments,
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
        return (
          <button
            key={`${segment.start}-${index}`}
            type="button"
            onClick={() => onSeek?.(segment.start)}
            className={`rounded-lg border-l-4 px-3 py-2 text-left transition ${speakerColor(
              segment.speaker,
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
