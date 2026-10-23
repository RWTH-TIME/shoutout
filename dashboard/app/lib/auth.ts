import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getServerSession } from "next-auth/next";
import { NextRequest } from "next/server";
import { authOptions } from "../api/auth/[...nextauth]/authOptions";
import { prisma } from "./prisma";
import config from "./config";

export type AuthContext = {
  owner: string;
  email?: string | null;
  kind: "session" | "apiKey" | "worker" | "enrollment";
  workerId?: string;
  apiKeyId?: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function generateApiKeySecret(): {
  token: string;
  prefix: string;
  hash: string;
} {
  const prefix = randomBytes(4).toString("hex");
  const secret = randomBytes(24).toString("base64url");
  const token = `so_${prefix}_${secret}`;
  return { token, prefix, hash: hashToken(token) };
}

export function generateWorkerToken(): { token: string; hash: string } {
  const token = `wk_${randomBytes(32).toString("base64url")}`;
  return { token, hash: hashToken(token) };
}

export function generateResultToken(): string {
  return randomBytes(24).toString("base64url");
}

async function authenticateApiKey(token: string): Promise<AuthContext | null> {
  const hash = hashToken(token);
  const key = await prisma.apiKey.findUnique({ where: { hash } });
  if (!key || key.revokedAt) {
    return null;
  }
  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });
  return {
    owner: key.owner,
    email: key.ownerEmail,
    kind: "apiKey",
    apiKeyId: key.id,
  };
}

async function authenticateWorker(token: string): Promise<AuthContext | null> {
  const hash = hashToken(token);
  const worker = await prisma.worker.findFirst({ where: { tokenHash: hash } });
  if (!worker) {
    return null;
  }
  await prisma.worker.update({
    where: { id: worker.id },
    data: { lastSeenAt: new Date() },
  });
  return {
    owner: worker.id,
    kind: "worker",
    workerId: worker.id,
  };
}

export async function authenticate(
  request: NextRequest,
  options: { allowSession?: boolean; allowApiKey?: boolean } = {
    allowSession: true,
    allowApiKey: true,
  }
): Promise<AuthContext | null> {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ") && options.allowApiKey !== false) {
    const token = header.slice("Bearer ".length).trim();
    if (token.startsWith("so_")) {
      return authenticateApiKey(token);
    }
  }

  if (options.allowSession === false) {
    return null;
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  return {
    owner: session.user.id,
    email: session.user.email,
    kind: "session",
  };
}

export async function authenticateWorkerRequest(
  request: NextRequest
): Promise<AuthContext | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  if (token.startsWith("wk_")) {
    return authenticateWorker(token);
  }
  return null;
}

export function authenticateEnrollment(request: NextRequest): boolean {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return false;
  }
  const token = header.slice("Bearer ".length).trim();
  return safeEqual(token, config.WORKER_ENROLLMENT_TOKEN);
}

export { hashToken };
