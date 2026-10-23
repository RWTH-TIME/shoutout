import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../../../../lib/auth";
import {
  canViewJob,
  isJobExpired,
} from "../../../../../../services/accessService";
import { getJobByPublicId } from "../../../../../../services/jobService";
import { presignInlineGet, uploadObjectKey } from "../../../../../../lib/storage";

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
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await presignInlineGet(uploadObjectKey(file.audioFile));
  return NextResponse.redirect(url, 302);
};
