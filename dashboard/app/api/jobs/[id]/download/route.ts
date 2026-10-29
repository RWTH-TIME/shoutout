import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../../lib/auth";
import {
  canViewJob,
  isJobExpired,
} from "../../../../services/accessService";
import { getJobByPublicId } from "../../../../services/jobService";
import {
  fileBaseName,
  renderFileTranscriptText,
  renderJobTranscriptZip,
} from "../../../../lib/transcriptExport";

export const runtime = "nodejs";

export const GET = async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const auth = await authenticate(request);
  const { id } = await context.params;
  const job = await getJobByPublicId(id);
  if (!job || isJobExpired(job.expiresAt) || !canViewJob(job, auth)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (job.status !== "FINISHED") {
    return NextResponse.json({ error: "Result not ready" }, { status: 400 });
  }

  try {
    const fileId = request.nextUrl.searchParams.get("fileId");
    if (fileId) {
      const file = job.files.find((item) => item.id === fileId);
      if (!file) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      const text = await renderFileTranscriptText(file);
      return new NextResponse(text, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileBaseName(file.originalName)}.txt"`,
        },
      });
    }

    const { buffer, fileName } = await renderJobTranscriptZip(
      job.files,
      job.name
    );
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
