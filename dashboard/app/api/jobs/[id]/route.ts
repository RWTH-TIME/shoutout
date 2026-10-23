import { NextRequest, NextResponse } from "next/server";
import { Visibility } from "@prisma/client";
import { z } from "zod";
import { authenticate } from "../../../lib/auth";
import {
  canManageJob,
  canViewJob,
  isJobExpired,
} from "../../../services/accessService";
import {
  deleteJobByPublicId,
  getJobByPublicId,
  updateJobForOwner,
} from "../../../services/jobService";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  visibility: z.nativeEnum(Visibility).optional(),
  notifyEnabled: z.boolean().optional(),
});

export const GET = async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const auth = await authenticate(request);
  const { id } = await context.params;
  const job = await getJobByPublicId(id);
  if (!job || isJobExpired(job.expiresAt) || !canViewJob(job, auth)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      job,
      canManage: canManageJob(job, auth),
    },
    { status: 200 }
  );
};

export const PATCH = async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const auth = await authenticate(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = patchSchema.parse(await request.json());
  try {
    const job = await updateJobForOwner(id, auth.owner, body);
    return NextResponse.json({ job }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status =
      message === "Forbidden" ? 403 : message === "Job not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
};

export const DELETE = async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const auth = await authenticate(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const res = await deleteJobByPublicId(id, auth.owner);
    return NextResponse.json({ res }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status =
      message === "Forbidden" ? 403 : message === "Job not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
};
