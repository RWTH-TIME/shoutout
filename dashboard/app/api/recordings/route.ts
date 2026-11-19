import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "../../lib/auth";
import { startRecording } from "../../services/recordingService";

const startSchema = z.object({
  name: z.string().min(1),
  model: z.string().min(1),
  participants: z.number().int().nonnegative().optional(),
  language: z.string().optional(),
  notifyEmail: z.string().email().optional().or(z.literal("")),
  notifyEnabled: z.boolean().optional(),
  extension: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
});

export const POST = async (request: NextRequest) => {
  const auth = await authenticate(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = startSchema.parse(await request.json());

  try {
    const job = await startRecording({
      name: body.name,
      model: body.model,
      participants: body.participants,
      language: body.language,
      notifyEmail: body.notifyEmail || auth.email || undefined,
      notifyEnabled: body.notifyEnabled,
      owner: auth.owner,
      extension: body.extension,
      originalName: body.originalName,
      mimeType: body.mimeType,
    });
    return NextResponse.json({ job }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
