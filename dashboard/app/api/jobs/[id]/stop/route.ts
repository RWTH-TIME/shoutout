import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../../lib/auth";
import { stopJobByPublicId } from "../../../../services/jobService";

export const POST = async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const auth = await authenticate(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const job = await stopJobByPublicId(id, auth.owner);
    return NextResponse.json({ job }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status =
      message === "Forbidden" ? 403 : message === "Job not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
};
