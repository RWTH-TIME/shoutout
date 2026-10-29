import type { jobFile } from "@prisma/client";
import JSZip from "jszip";
import { getObjectText } from "./storage";
import {
  applySpeakerNames,
  parseTranscriptPayload,
  renderTranscriptText,
  speakerNamesFromJson,
} from "../utils/transcript";

function fileBaseName(originalName: string): string {
  return originalName.includes(".")
    ? originalName.substring(0, originalName.lastIndexOf("."))
    : originalName;
}

export async function renderFileTranscriptText(
  file: jobFile
): Promise<string> {
  if (!file.resultJsonKey) {
    throw new Error("Result not ready");
  }
  const raw = await getObjectText(file.resultJsonKey);
  const payload = JSON.parse(raw) as unknown;
  const segments = parseTranscriptPayload(payload);
  const mapped = applySpeakerNames(
    segments,
    speakerNamesFromJson(file.speakerNames)
  );
  return renderTranscriptText(mapped);
}

export async function renderJobTranscriptZip(
  files: jobFile[],
  jobName: string
): Promise<{ buffer: Buffer; fileName: string }> {
  const zip = new JSZip();
  let added = 0;

  for (const file of files) {
    if (!file.resultJsonKey) {
      continue;
    }
    const text = await renderFileTranscriptText(file);
    zip.file(`${fileBaseName(file.originalName)}.txt`, text);
    added += 1;
  }

  if (added === 0) {
    throw new Error("Result not ready");
  }

  const buffer = Buffer.from(
    await zip.generateAsync({ type: "nodebuffer" })
  );
  return {
    buffer,
    fileName: `${jobName}.zip`,
  };
}

export { fileBaseName };
