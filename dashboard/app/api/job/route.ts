import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../lib/auth";
import {
  createJob,
  deleteJobForOwner,
  listJobsByOwner,
} from "../../services/jobService";
import { z } from "zod";

const fileSchema = z.object({
  audioFile: z.string().min(1),
  originalName: z.string().min(1),
  participants: z.number().int().nonnegative().optional(),
  language: z.string().optional(),
});

const createSchema = z
  .object({
    name: z.string().min(1),
    model: z.string().min(1),
    participants: z.number().int().nonnegative().optional(),
    language: z.string().optional(),
    notifyEmail: z.string().email().optional().or(z.literal("")),
    notifyEnabled: z.boolean().optional(),
    audioFile: z.string().min(1).optional(),
    files: z.array(fileSchema).optional(),
  })
  .refine(
    (value) =>
      (value.files && value.files.length > 0) || Boolean(value.audioFile),
    { message: "At least one file is required" }
  );

export const GET = async (request: NextRequest) => {
  const auth = await authenticate(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await listJobsByOwner(auth.owner);
  return NextResponse.json({ jobs }, { status: 200 });
};

export const POST = async (request: NextRequest) => {
  const auth = await authenticate(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = createSchema.parse(await request.json());
  const files =
    body.files && body.files.length > 0
      ? body.files
      : [
          {
            audioFile: body.audioFile!,
            originalName: body.name,
            participants: body.participants,
            language: body.language,
          },
        ];

  try {
    const res = await createJob({
      name: body.name,
      model: body.model,
      participants: body.participants,
      language: body.language,
      owner: auth.owner,
      notifyEmail: body.notifyEmail || auth.email || undefined,
      notifyEnabled: body.notifyEnabled,
      files,
    });
    return NextResponse.json({ res }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};

export const DELETE = async (request: NextRequest) => {
  const auth = await authenticate(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobName = request.nextUrl.searchParams.get("jobName");
  if (!jobName) {
    return NextResponse.json({ error: "Missing jobName" }, { status: 400 });
  }

  try {
    const res = await deleteJobForOwner(jobName, auth.owner);
    return NextResponse.json({ res }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status =
      message === "Forbidden" ? 403 : message === "Job not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
};
