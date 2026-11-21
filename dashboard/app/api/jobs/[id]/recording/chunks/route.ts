import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "../../../../../lib/auth";
import { presignRecordingChunk } from "../../../../../services/recordingService";
import { recordingErrorResponse } from "../../../../../utils/recording/recordingErrors";

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

  try {
    const { id: publicId } = await context.params;
    const body = chunkSchema.parse(await request.json());
    const result = await presignRecordingChunk(
      publicId,
      auth.owner,
      body.sequence
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return recordingErrorResponse(error);
  }
};
