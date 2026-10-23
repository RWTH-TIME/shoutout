import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, generateApiKeySecret } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

const createSchema = z.object({
  name: z.string().min(1).max(80),
});

export const GET = async (request: NextRequest) => {
  const auth = await authenticate(request, {
    allowSession: true,
    allowApiKey: false,
  });
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { owner: auth.owner, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

  return NextResponse.json({ keys }, { status: 200 });
};

export const POST = async (request: NextRequest) => {
  const auth = await authenticate(request, {
    allowSession: true,
    allowApiKey: false,
  });
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = createSchema.parse(await request.json());
  const secret = generateApiKeySecret();

  const key = await prisma.apiKey.create({
    data: {
      owner: auth.owner,
      name: body.name,
      prefix: secret.prefix,
      hash: secret.hash,
      ownerEmail: auth.email ?? undefined,
    },
  });

  return NextResponse.json(
    {
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      createdAt: key.createdAt,
      token: secret.token,
    },
    { status: 201 }
  );
};
