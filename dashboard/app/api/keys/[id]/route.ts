import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export const DELETE = async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const auth = await authenticate(request, {
    allowSession: true,
    allowApiKey: false,
  });
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const key = await prisma.apiKey.findUnique({ where: { id } });
  if (!key || key.owner !== auth.owner) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
};
