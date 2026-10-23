import { NextRequest, NextResponse } from "next/server";
import { Status } from "@prisma/client";
import { authenticate } from "../../../lib/auth";
import { parseMultipartUpload } from "../../../lib/multipart";
import {
  createJob,
  listJobsByOwner,
} from "../../../services/jobService";

export const GET = async (request: NextRequest) => {
  const auth = await authenticate(request, {
    allowSession: false,
    allowApiKey: true,
  });
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const status =
    statusParam && Object.values(Status).includes(statusParam as Status)
      ? (statusParam as Status)
      : undefined;

  const jobs = await listJobsByOwner(auth.owner, status);
  return NextResponse.json({ jobs }, { status: 200 });
};

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
      fileFields: ["file"],
    });
    const file = files[0];
    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (!fields.name || !fields.model) {
      return NextResponse.json(
        { error: "Missing name or model" },
        { status: 400 }
      );
    }

    const job = await createJob({
      name: fields.name,
      audioFile: file.uploadRef,
      model: fields.model,
      participants: fields.participants
        ? Number(fields.participants)
        : undefined,
      language: fields.language,
      notifyEmail: fields.notifyEmail || auth.email || undefined,
      owner: auth.owner,
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
