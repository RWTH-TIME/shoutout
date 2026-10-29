import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "../../../../../../lib/auth";
import { updateFileSpeakerNames } from "../../../../../../services/jobService";

const patchSchema = z.object({
  speakerNames: z.record(z.string()),
});

export const PATCH = async (
  request: NextRequest,
  context: { params: Promise<{ id: string; fileId: string }> }
) => {
  const auth = await authenticate(request);
  if (!auth || auth.kind === "worker" || auth.kind === "enrollment") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, fileId } = await context.params;
  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const job = await updateFileSpeakerNames(
      id,
      fileId,
      auth.owner,
      body.speakerNames
    );
    return NextResponse.json({ job }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status =
      message === "Forbidden"
        ? 403
        : message === "Job not found" || message === "File not found"
          ? 404
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
};
