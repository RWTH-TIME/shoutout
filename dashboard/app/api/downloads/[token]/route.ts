import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { Status } from "@prisma/client";
import { presignDownload } from "../../../lib/storage";

export const GET = async (
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) => {
  const { token } = await context.params;
  const job = await prisma.job.findUnique({ where: { resultToken: token } });

  if (!job || job.status !== Status.FINISHED || !job.audioFile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await presignDownload(job.audioFile, job.name);
  return NextResponse.redirect(url, 302);
};
