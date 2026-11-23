import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../../../../lib/auth";
import {
  canViewJob,
  isJobExpired,
} from "../../../../../../services/accessService";
import { getJobByPublicId } from "../../../../../../services/jobService";
import {
  pdfResponseHeaders,
  renderFileTranscriptPdf,
} from "../../../../../../lib/pdf/renderTranscriptPdf";

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
    const pdf = await renderFileTranscriptPdf(job.name, file);
    return new NextResponse(new Uint8Array(pdf.buffer), {
      status: 200,
      headers: pdfResponseHeaders(pdf.fileName, "inline"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
