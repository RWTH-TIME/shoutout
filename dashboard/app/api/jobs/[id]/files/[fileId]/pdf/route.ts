import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../../../../lib/auth";
import {
  canViewJob,
  isJobExpired,
} from "../../../../../../services/accessService";
import { getJobByPublicId } from "../../../../../../services/jobService";
import { getObjectText } from "../../../../../../lib/storage";
import { renderTranscriptPdf } from "../../../../../../lib/pdf/renderTranscriptPdf";
import {
  applySpeakerNames,
  computeSpeakerStats,
  parseTranscriptPayload,
  speakerNamesFromJson,
} from "../../../../../../utils/transcript";

export const runtime = "nodejs";

export const GET = async (
  request: NextRequest,
  context: { params: Promise<{ id: string; fileId: string }> }
) => {
  const auth = await authenticate(request);
  const { id, fileId } = await context.params;
  const job = await getJobByPublicId(id);
  if (!job || isJobExpired(job.expiresAt) || !canViewJob(job, auth)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const file = job.files.find((item) => item.id === fileId);
  if (!file?.resultJsonKey) {
    return NextResponse.json({ error: "Result not ready" }, { status: 400 });
  }

  try {
    const raw = await getObjectText(file.resultJsonKey);
    const payload = JSON.parse(raw) as unknown;
    const segments = applySpeakerNames(
      parseTranscriptPayload(payload),
      speakerNamesFromJson(file.speakerNames)
    );
    const stats = computeSpeakerStats(segments);

    const buffer = await renderTranscriptPdf({
      jobName: job.name,
      fileName: file.originalName,
      generatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      stats,
      segments,
      labels: {
        statistics: "Statistics",
        speakersDetected: "Speakers detected",
        totalWords: "Total words",
        totalCharacters: "Total characters",
        wordsLabel: "words",
        transcript: "Transcript",
      },
    });

    const safeName = file.originalName.replace(/[^\w.-]+/g, "_");
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
