import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "../../../../../lib/auth";
import { finishRecording } from "../../../../../services/recordingService";

const finishSchema = z.object({
  chunkCount: z.number().int().positive(),
  durationSeconds: z.number().nonnegative().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const POST = async (request: NextRequest, context: RouteContext) => {
  const auth = await authenticate(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: publicId } = await context.params;
  const body = finishSchema.parse(await request.json());

  try {
    const job = await finishRecording(
      publicId,
      auth.owner,
      body.chunkCount,
      body.durationSeconds
    );
    return NextResponse.json({ job }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status =
      message === "Forbidden"
        ? 403
        : message === "Job not found"
          ? 404
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
};
