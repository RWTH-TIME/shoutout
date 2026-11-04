import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateWorkerRequest } from "../../../../lib/auth";
import {
  claimJob,
  updateWorkerPresence,
} from "../../../../services/workerService";
import { prisma } from "../../../../lib/prisma";
import config from "../../../../lib/config";

const schema = z.object({
  models: z.array(z.string().min(1)).optional(),
  info: z.record(z.unknown()).optional(),
  // How long the worker waits for this response; the poll must end before it.
  waitMs: z.number().int().positive().optional(),
});

export const POST = async (request: NextRequest) => {
  const auth = await authenticateWorkerRequest(request);
  if (!auth?.workerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.parse(await request.json().catch(() => ({})));
  const worker = await prisma.worker.findUnique({ where: { id: auth.workerId } });
  if (!worker) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const models = body.models ?? worker.models;
  await updateWorkerPresence(auth.workerId, models, body.info);

  const timeoutMs = Math.min(
    config.CLAIM_POLL_MS,
    body.waitMs ?? config.CLAIM_POLL_MS
  );
  const claimed = await claimJob(
    auth.workerId,
    models,
    timeoutMs,
    request.signal
  );
  if (!claimed) {
    return NextResponse.json({ job: null }, { status: 200 });
  }

  return NextResponse.json(
    {
      job: {
        id: claimed.job.id,
        publicId: claimed.job.publicId,
        name: claimed.job.name,
        model: claimed.job.model,
        participants: claimed.job.participants,
        language: claimed.job.language,
        claimCount: claimed.job.claimCount,
      },
      files: claimed.files,
      zipUploadUrl: claimed.zipUploadUrl,
    },
    { status: 200 }
  );
};
