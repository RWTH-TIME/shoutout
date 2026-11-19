import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "../../../../../lib/auth";
import { presignRecordingChunk } from "../../../../../services/recordingService";

const chunkSchema = z.object({
  sequence: z.number().int().nonnegative(),
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
  const body = chunkSchema.parse(await request.json());

  try {
    const result = await presignRecordingChunk(
      publicId,
      auth.owner,
      body.sequence
    );
    return NextResponse.json(result, { status: 200 });
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
