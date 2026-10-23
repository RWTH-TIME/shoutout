import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../../lib/auth";
import {
  canViewJob,
  isJobExpired,
} from "../../../../services/accessService";
import {
  getDownloadUrlForJobRecord,
  getFileTextDownloadUrl,
  getJobByPublicId,
} from "../../../../services/jobService";

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

  try {
    const fileId = request.nextUrl.searchParams.get("fileId");
    const url = fileId
      ? await getFileTextDownloadUrl(job, fileId)
      : await getDownloadUrlForJobRecord(job);
    return NextResponse.redirect(url, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
