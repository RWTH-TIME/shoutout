import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../lib/auth";
import { listUsage } from "../../../lib/serviceAccounts";

export const GET = async (request: NextRequest) => {
  const auth = await authenticate(request, {
    allowSession: false,
    allowApiKey: true,
  });
  if (!auth?.serviceAccountId) {
    return NextResponse.json({ error: "Service account required" }, { status: 403 });
  }

  const fromRaw = request.nextUrl.searchParams.get("from");
  const toRaw = request.nextUrl.searchParams.get("to");
  const from = fromRaw ? new Date(fromRaw) : undefined;
  const to = toRaw ? new Date(toRaw) : undefined;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    return NextResponse.json({ error: "Invalid from or to" }, { status: 400 });
  }

  const usage = await listUsage(auth.serviceAccountId, from, to);
  return NextResponse.json(usage, { status: 200 });
};
