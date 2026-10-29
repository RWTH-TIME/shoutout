import { TranscriptSegment } from "../types/types";

export type SpeakerPaletteEntry = {
  tailwind: string;
  hex: string;
};

export const SPEAKER_PALETTE: SpeakerPaletteEntry[] = [
  { tailwind: "border-l-blue-500 bg-blue-500/5", hex: "#3b82f6" },
  { tailwind: "border-l-emerald-500 bg-emerald-500/5", hex: "#10b981" },
  { tailwind: "border-l-amber-500 bg-amber-500/5", hex: "#f59e0b" },
  { tailwind: "border-l-violet-500 bg-violet-500/5", hex: "#8b5cf6" },
  { tailwind: "border-l-rose-500 bg-rose-500/5", hex: "#f43f5e" },
  { tailwind: "border-l-cyan-500 bg-cyan-500/5", hex: "#06b6d4" },
];

export type SpeakerNames = Record<string, string>;

export type SpeakerStat = {
  speaker: string;
  words: number;
  chars: number;
  percentage: number;
};

export type SpeakerStats = {
  totalWords: number;
  totalChars: number;
  speakerCount: number;
  perSpeaker: SpeakerStat[];
};

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

export function collectSpeakerIds(segments: TranscriptSegment[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const segment of segments) {
    if (!seen.has(segment.speaker)) {
      seen.add(segment.speaker);
      ids.push(segment.speaker);
    }
  }
  return ids;
}

export function applySpeakerNames(
  segments: TranscriptSegment[],
  mapping: SpeakerNames | null | undefined
): TranscriptSegment[] {
  if (!mapping || Object.keys(mapping).length === 0) {
    return segments;
  }
  return segments.map((segment) => {
    const mapped = mapping[segment.speaker]?.trim();
    return {
      ...segment,
      speaker: mapped || segment.speaker,
    };
  });
}

export function detectSpeakerMerges(
  mapping: SpeakerNames
): string[][] {
  const byLabel = new Map<string, string[]>();
  for (const [rawId, label] of Object.entries(mapping)) {
    const trimmed = label.trim();
    if (!trimmed) {
      continue;
    }
    const group = byLabel.get(trimmed) ?? [];
    group.push(rawId);
    byLabel.set(trimmed, group);
  }
  return Array.from(byLabel.values()).filter((group) => group.length > 1);
}

export function normalizeSpeakerNames(
  drafts: SpeakerNames
): SpeakerNames {
  const result: SpeakerNames = {};
  for (const [rawId, label] of Object.entries(drafts)) {
    const trimmed = label.trim();
    if (!trimmed || trimmed === rawId) {
      continue;
    }
    result[rawId] = trimmed;
  }
  return result;
}

export function computeSpeakerStats(
  segments: TranscriptSegment[]
): SpeakerStats {
  const bySpeaker = new Map<string, { words: number; chars: number }>();
  let totalWords = 0;
  let totalChars = 0;

  for (const segment of segments) {
    const words = countWords(segment.text);
    const chars = segment.text.length;
    totalWords += words;
    totalChars += chars;
    const current = bySpeaker.get(segment.speaker) ?? { words: 0, chars: 0 };
    current.words += words;
    current.chars += chars;
    bySpeaker.set(segment.speaker, current);
  }

  const order = collectSpeakerIds(segments);
  const perSpeaker: SpeakerStat[] = order.map((speaker) => {
    const counts = bySpeaker.get(speaker) ?? { words: 0, chars: 0 };
    return {
      speaker,
      words: counts.words,
      chars: counts.chars,
      percentage:
        totalWords > 0
          ? Math.round((counts.words / totalWords) * 1000) / 10
          : 0,
    };
  });

  return {
    totalWords,
    totalChars,
    speakerCount: perSpeaker.length,
    perSpeaker,
  };
}

function formatStampHms(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function renderTranscriptText(
  segments: TranscriptSegment[]
): string {
  return segments
    .map((segment) => {
      const stamp = formatStampHms(segment.start);
      return `${segment.speaker} ${stamp}\n${segment.text}\n\n`;
    })
    .join("");
}

export function speakerPaletteIndex(
  speaker: string,
  indexMap: Map<string, number>
): number {
  if (!indexMap.has(speaker)) {
    indexMap.set(speaker, indexMap.size);
  }
  return indexMap.get(speaker) ?? 0;
}

export function speakerColorClass(
  speaker: string,
  indexMap: Map<string, number>
): string {
  const index = speakerPaletteIndex(speaker, indexMap);
  const entry = SPEAKER_PALETTE[index % SPEAKER_PALETTE.length];
  return entry?.tailwind ?? SPEAKER_PALETTE[0].tailwind;
}

export function speakerColorHex(
  speaker: string,
  indexMap: Map<string, number>
): string {
  const index = speakerPaletteIndex(speaker, indexMap);
  const entry = SPEAKER_PALETTE[index % SPEAKER_PALETTE.length];
  return entry?.hex ?? SPEAKER_PALETTE[0].hex;
}

export function parseTranscriptPayload(payload: unknown): TranscriptSegment[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const segments = (payload as { segments?: unknown }).segments;
  if (!Array.isArray(segments)) {
    return [];
  }
  return segments.filter(
    (item): item is TranscriptSegment =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as TranscriptSegment).speaker === "string" &&
      typeof (item as TranscriptSegment).start === "number" &&
      typeof (item as TranscriptSegment).end === "number" &&
      typeof (item as TranscriptSegment).text === "string"
  );
}

export function speakerNamesFromJson(
  value: unknown
): SpeakerNames | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const result: SpeakerNames = {};
  for (const [key, label] of Object.entries(value as Record<string, unknown>)) {
    if (typeof label === "string" && label.trim()) {
      result[key] = label.trim();
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}
