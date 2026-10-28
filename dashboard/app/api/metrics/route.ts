import { NextRequest, NextResponse } from "next/server";
import { renderMetrics } from "../../services/metricsService";

export const dynamic = "force-dynamic";

function presentedClient(request: NextRequest): string | null {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }
  const forwarded = request.headers.get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return forwarded || null;
}

function isLocalCollector(request: NextRequest): boolean {
  const client = presentedClient(request);
  if (!client) {
    return true;
  }
  return client === "127.0.0.1" || client === "::1";
}

export const GET = async (request: NextRequest) => {
  if (!isLocalCollector(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await renderMetrics();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};
