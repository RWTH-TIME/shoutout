import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateEnrollment } from "../../../lib/auth";
import { registerWorker } from "../../../services/workerService";

const schema = z.object({
  name: z.string().min(1),
  models: z.array(z.string().min(1)).min(1),
  info: z.record(z.unknown()).optional(),
});

export const POST = async (request: NextRequest) => {
  if (!authenticateEnrollment(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.parse(await request.json());
  const { worker, token } = await registerWorker({
    name: body.name,
    models: body.models,
    info: body.info,
  });

  return NextResponse.json(
    {
      id: worker.id,
      name: worker.name,
      models: worker.models,
      token,
    },
    { status: 201 }
  );
};
