import { renderToBuffer } from "@react-pdf/renderer";
import { TranscriptSegment } from "../../types/types";
import { SpeakerStats } from "../../utils/transcript";
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
