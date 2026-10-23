import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../../../lib/auth";
import { getDownloadUrlForJob } from "../../../../../services/jobService";

export const GET = async (
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) => {
  const auth = await authenticate(request, {
    allowSession: false,
    allowApiKey: true,
  });
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await context.params;
  try {
    const url = await getDownloadUrlForJob(
      decodeURIComponent(name),
      auth.owner
    );
    return NextResponse.redirect(url, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status =
      message === "Forbidden" ? 403 : message === "Job not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
};
