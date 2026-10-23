import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../../../../../lib/auth";
import {
  canViewJob,
  isJobExpired,
} from "../../../../../../../services/accessService";
import { getJobByPublicId } from "../../../../../../../services/jobService";
import { getObjectText } from "../../../../../../../lib/storage";

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
    const text = await getObjectText(file.resultJsonKey);
    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
