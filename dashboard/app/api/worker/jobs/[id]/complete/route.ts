import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateWorkerRequest } from "../../../../../lib/auth";
import { completeJob } from "../../../../../services/jobService";
import { prisma } from "../../../../../lib/prisma";

const schema = z.object({
  files: z
    .array(
      z.object({
        id: z.string().uuid(),
        durationSeconds: z.number().nonnegative().optional(),
      })
    )
    .optional()
    .default([]),
});

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

  const body = schema.parse(await request.json().catch(() => ({})));
  await completeJob(jobId, auth.workerId, body.files);
  return NextResponse.json({ ok: true }, { status: 200 });
};
