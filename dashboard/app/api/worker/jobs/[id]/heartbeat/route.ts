import { NextRequest, NextResponse } from "next/server";
import { authenticateWorkerRequest } from "../../../../../lib/auth";
import { heartbeatJob } from "../../../../../services/workerService";

export const POST = async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const auth = await authenticateWorkerRequest(request);
  if (!auth?.workerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    await heartbeatJob(Number(id), auth.workerId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
};
