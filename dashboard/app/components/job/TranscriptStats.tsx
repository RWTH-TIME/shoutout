"use client";

import { useMemo } from "react";
import { TranscriptSegment } from "../../types/types";
import useAppTranslation from "../../hooks/useAppTranslation";
import {
  computeSpeakerStats,
  SPEAKER_PALETTE,
} from "../../utils/transcript";

type Props = {
  segments: TranscriptSegment[] | null;
  loading?: boolean;
};

function buildConicGradient(
  percentages: number[],
  colors: string[]
): string {
  if (percentages.length === 0) {
    return "conic-gradient(#e5e7eb 0% 100%)";
  }
  const stops: string[] = [];
  let cursor = 0;
  percentages.forEach((percentage, index) => {
    const color = colors[index % colors.length] ?? colors[0];
    const next = cursor + percentage;
    stops.push(`${color} ${cursor}% ${next}%`);
    cursor = next;
  });
  if (cursor < 100) {
    stops.push(`#e5e7eb ${cursor}% 100%`);
  }
  return `conic-gradient(${stops.join(", ")})`;
}

export default function TranscriptStats({
  segments,
  loading = false,
}: Props) {
  const translation = useAppTranslation();
  const stats = useMemo(
    () => (segments && segments.length > 0 ? computeSpeakerStats(segments) : null),
    [segments]
  );

  if (loading || !stats) {
    return null;
  }

  const colors = SPEAKER_PALETTE.map((entry) => entry.hex);
  const gradient = buildConicGradient(
    stats.perSpeaker.map((item) => item.percentage),
    colors
  );

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-divider p-4">
      <div className="text-sm font-semibold">
        {translation("statisticsTitle")}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-description">
            {translation("speakersDetected")}
          </div>
          <div className="mt-1 text-lg font-semibold">{stats.speakerCount}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-description">
            {translation("totalWords")}
          </div>
          <div className="mt-1 text-lg font-semibold">{stats.totalWords}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-description">
            {translation("totalCharacters")}
          </div>
          <div className="mt-1 text-lg font-semibold">{stats.totalChars}</div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div
          className="relative h-36 w-36 shrink-0 rounded-full"
          style={{ background: gradient }}
          aria-hidden
        >
          <div className="absolute inset-[22%] rounded-full bg-surface" />
        </div>

        <ul className="flex min-w-0 flex-1 flex-col gap-2">
          {stats.perSpeaker.map((item, index) => {
            const color = colors[index % colors.length] ?? colors[0];
            return (
              <li
                key={`${item.speaker}-${index}`}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate font-medium">{item.speaker}</span>
                </div>
                <div className="shrink-0 text-description">
                  {item.words} {translation("wordsLabel")} · {item.percentage}%
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
