import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../lib/auth";
import {
  deleteObjects,
  presignUpload,
  resultObjectKey,
  uploadObjectKey,
} from "../../lib/storage";
import { STATUS } from "../../types/types";
import { getJobByName } from "../../services/jobService";

export const GET = async (request: NextRequest) => {
  const auth = await authenticate(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileName = request.nextUrl.searchParams.get("fileName");
  if (!fileName) {
    return NextResponse.json({ error: "Missing fileName" }, { status: 400 });
  }

  const fileFormat = fileName.substring(fileName.lastIndexOf("."));
  const uuidFileName = `${crypto.randomUUID()}${fileFormat}`;
  const presignedUrl = await presignUpload(uuidFileName);

  return NextResponse.json(
    { presignedUrl, uuidFileName },
    { status: 200 }
  );
};

export const DELETE = async (request: NextRequest) => {
  const auth = await authenticate(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileName = request.nextUrl.searchParams.get("fileName");
  const status = request.nextUrl.searchParams.get("status");
  const jobName = request.nextUrl.searchParams.get("jobName");

  if (!fileName) {
    return NextResponse.json({ error: "Missing fileName" }, { status: 400 });
  }

  if (jobName) {
    const job = await getJobByName(jobName);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.owner !== auth.owner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const keys = [uploadObjectKey(fileName)];
  if (status === STATUS.Finished) {
    keys.push(resultObjectKey(fileName));
  }

  await deleteObjects(keys);
  return NextResponse.json({ status: 200 });
};
