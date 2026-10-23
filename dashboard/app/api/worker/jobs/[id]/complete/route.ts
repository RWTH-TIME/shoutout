import { NextRequest, NextResponse } from "next/server";
import { authenticateWorkerRequest } from "../../../../../lib/auth";
import { completeJob } from "../../../../../services/jobService";
import { prisma } from "../../../../../lib/prisma";

export const POST = async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const auth = await authenticateWorkerRequest(request);
  if (!auth?.workerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const jobId = Number(id);
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.workerId !== auth.workerId) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  await completeJob(jobId, auth.workerId);
  return NextResponse.json({ ok: true }, { status: 200 });
};
