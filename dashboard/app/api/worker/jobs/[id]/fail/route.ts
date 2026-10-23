import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateWorkerRequest } from "../../../../../lib/auth";
import { failJob } from "../../../../../services/jobService";

const schema = z.object({
  error: z.string().min(1),
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
  const body = schema.parse(await request.json());

  try {
    await failJob(Number(id), auth.workerId, body.error);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
};
