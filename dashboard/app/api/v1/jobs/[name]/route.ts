import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../../lib/auth";
import {
  deleteJobForOwner,
  getJobByName,
} from "../../../../services/jobService";

export const GET = async (
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) => {
  const auth = await authenticate(request, {
    allowSession: false,
    allowApiKey: true,
  });
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await context.params;
  const job = await getJobByName(decodeURIComponent(name));
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.owner !== auth.owner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ job }, { status: 200 });
};

export const DELETE = async (
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) => {
  const auth = await authenticate(request, {
    allowSession: false,
    allowApiKey: true,
  });
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await context.params;
  try {
    const res = await deleteJobForOwner(decodeURIComponent(name), auth.owner);
    return NextResponse.json({ res }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status =
      message === "Forbidden" ? 403 : message === "Job not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
};
