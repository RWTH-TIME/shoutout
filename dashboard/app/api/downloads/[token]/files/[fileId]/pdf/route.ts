import { NextRequest, NextResponse } from "next/server";
import { Status } from "@prisma/client";
import { prisma } from "../../../../../../lib/prisma";
import { isJobExpired } from "../../../../../../services/accessService";
import {
  pdfResponseHeaders,
  renderFileTranscriptPdf,
} from "../../../../../../lib/pdf/renderTranscriptPdf";

export const runtime = "nodejs";

export const GET = async (
  _request: NextRequest,
  context: { params: Promise<{ token: string; fileId: string }> }
) => {
  const { token, fileId } = await context.params;
  const job = await prisma.job.findUnique({
    where: { resultToken: token },
    include: { files: true },
  });

  if (!job || job.status !== Status.FINISHED || isJobExpired(job.expiresAt)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const file = job.files.find((item) => item.id === fileId);
  if (!file?.resultJsonKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const pdf = await renderFileTranscriptPdf(job.name, file);
    return new NextResponse(new Uint8Array(pdf.buffer), {
      status: 200,
      headers: pdfResponseHeaders(pdf.fileName, "attachment"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
