import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "../../../../lib/auth";
import { parseMultipartUpload } from "../../../../lib/multipart";
import { createJob } from "../../../../services/jobService";

const metadataSchema = z.record(
  z.object({
    model: z.string().min(1).optional(),
    participants: z.number().int().nonnegative().optional(),
    language: z.string().optional(),
    notifyEmail: z.string().email().optional(),
    name: z.string().min(1).optional(),
  })
);

export const POST = async (request: NextRequest) => {
  const auth = await authenticate(request, {
    allowSession: false,
    allowApiKey: true,
  });
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { fields, files } = await parseMultipartUpload(request, {
      fileFields: ["files[]", "files", "file"],
    });

    if (files.length === 0) {
      return NextResponse.json({ error: "Missing files" }, { status: 400 });
    }

    const metadata = metadataSchema.parse(JSON.parse(fields.metadata ?? "{}"));
    const jobName =
      fields.name ||
      metadata[files[0]?.filename ?? ""]?.name ||
      files[0]?.filename.replace(/\.[^.]+$/, "") ||
      "job";
    const model =
      fields.model ||
      metadata[files[0]?.filename ?? ""]?.model;
    if (!model) {
      return NextResponse.json({ error: "Missing model" }, { status: 400 });
    }

    const fileInputs = [];
    const errors = [];
    for (const file of files) {
      const meta = metadata[file.filename] ?? {};
      fileInputs.push({
        audioFile: file.uploadRef,
        originalName: file.filename,
        participants: meta.participants,
        language: meta.language,
      });
    }

    if (fileInputs.length === 0) {
      return NextResponse.json({ jobs: [], errors }, { status: 400 });
    }

    const firstMeta = metadata[files[0]?.filename ?? ""] ?? {};
    const job = await createJob({
      name: jobName,
      model,
      participants: firstMeta.participants,
      language: firstMeta.language || fields.language,
      notifyEmail:
        firstMeta.notifyEmail || fields.notifyEmail || auth.email || undefined,
      owner: auth.owner,
      files: fileInputs,
    });

    return NextResponse.json({ jobs: [job], errors }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
