import { renderToBuffer } from "@react-pdf/renderer";
import type { jobFile } from "@prisma/client";
import { TranscriptSegment } from "../../types/types";
import { computeSpeakerStats, SpeakerStats } from "../../utils/transcript";
import { loadFileSegments } from "../transcriptExport";
import { registerPdfFonts } from "./fonts";
import TranscriptPdfDocument from "./TranscriptPdfDocument";

type Labels = {
  statistics: string;
  speakersDetected: string;
  totalWords: string;
  totalCharacters: string;
  wordsLabel: string;
  transcript: string;
};

type Input = {
  jobName: string;
  fileName: string;
  generatedAt: string;
  stats: SpeakerStats;
  segments: TranscriptSegment[];
  labels: Labels;
};

type RenderedPdf = {
  buffer: Buffer;
  fileName: string;
};

const DEFAULT_LABELS: Labels = {
  statistics: "Statistics",
  speakersDetected: "Speakers detected",
  totalWords: "Total words",
  totalCharacters: "Total characters",
  wordsLabel: "words",
  transcript: "Transcript",
};

export async function renderTranscriptPdf(
  input: Input
): Promise<Buffer> {
  registerPdfFonts();
  const buffer = await renderToBuffer(
    <TranscriptPdfDocument
      jobName={input.jobName}
      fileName={input.fileName}
      generatedAt={input.generatedAt}
      stats={input.stats}
      segments={input.segments}
      labels={input.labels}
    />
  );
  return Buffer.from(buffer);
}

export async function renderFileTranscriptPdf(
  jobName: string,
  file: jobFile
): Promise<RenderedPdf> {
  const segments: TranscriptSegment[] = await loadFileSegments(file);
  const buffer: Buffer = await renderTranscriptPdf({
    jobName,
    fileName: file.originalName,
    generatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    stats: computeSpeakerStats(segments),
    segments,
    labels: DEFAULT_LABELS,
  });
  return {
    buffer,
    fileName: `${file.originalName.replace(/[^\w.-]+/g, "_")}.pdf`,
  };
}

export function pdfResponseHeaders(
  fileName: string,
  disposition: "inline" | "attachment"
): HeadersInit {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `${disposition}; filename="${fileName}"`,
    "Cache-Control": "no-store",
  };
}
