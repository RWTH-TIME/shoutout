import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { Status } from "@prisma/client";
import { jobResultZipKey, presignDownload } from "../../../lib/storage";

export const GET = async (
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) => {
  const { token } = await context.params;
  const job = await prisma.job.findUnique({ where: { resultToken: token } });

  if (!job || job.status !== Status.FINISHED) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const zipKey = job.resultZipKey ?? jobResultZipKey(job.publicId);
  const url = await presignDownload(zipKey, `${job.name}.zip`, "application/zip");
  return NextResponse.redirect(url, 302);
};
