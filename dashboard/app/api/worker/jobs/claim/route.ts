import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateWorkerRequest } from "../../../../lib/auth";
import {
  claimJob,
  updateWorkerPresence,
} from "../../../../services/workerService";
import { prisma } from "../../../../lib/prisma";

const schema = z.object({
  models: z.array(z.string().min(1)).optional(),
  info: z.record(z.unknown()).optional(),
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

  const claimed = await claimJob(auth.workerId, models);
  if (!claimed) {
    return NextResponse.json({ job: null }, { status: 200 });
  }

  return NextResponse.json(
    {
      job: {
        id: claimed.job.id,
        name: claimed.job.name,
        audioFile: claimed.job.audioFile,
        model: claimed.job.model,
        participants: claimed.job.participants,
        language: claimed.job.language,
      },
      inputUrl: claimed.inputUrl,
      resultUrl: claimed.resultUrl,
    },
    { status: 200 }
  );
};
