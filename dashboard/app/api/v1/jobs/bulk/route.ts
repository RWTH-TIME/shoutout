import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "../../../../lib/auth";
import { parseMultipartUpload } from "../../../../lib/multipart";
import { createJob } from "../../../../services/jobService";

const metadataSchema = z.record(
  z.object({
    model: z.string().min(1),
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
    const jobs = [];
    const errors = [];

    for (const file of files) {
      const meta = metadata[file.filename];
      if (!meta) {
        errors.push({
          filename: file.filename,
          error: "Missing metadata for file",
        });
        continue;
      }

      try {
        const job = await createJob({
          name: meta.name ?? file.filename.replace(/\.[^.]+$/, ""),
          audioFile: file.uploadRef,
          model: meta.model,
          participants: meta.participants,
          language: meta.language,
          notifyEmail: meta.notifyEmail || auth.email || undefined,
          owner: auth.owner,
        });
        jobs.push(job);
      } catch (error) {
        errors.push({
          filename: file.filename,
          error: error instanceof Error ? error.message : "Failed",
        });
      }
    }

    return NextResponse.json({ jobs, errors }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
