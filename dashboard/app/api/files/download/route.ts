import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../lib/auth";
import { getDownloadUrlForJob } from "../../../services/jobService";

export const GET = async (request: NextRequest) => {
  const auth = await authenticate(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobName = request.nextUrl.searchParams.get("jobName");
  if (!jobName) {
    return NextResponse.json({ error: "Missing jobName" }, { status: 400 });
  }

  try {
    const presignedUrl = await getDownloadUrlForJob(jobName, auth.owner);
    return NextResponse.json({ presignedUrl }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status =
      message === "Forbidden" ? 403 : message === "Job not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
};
