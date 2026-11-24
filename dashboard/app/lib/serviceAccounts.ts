import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { prisma } from "./prisma";
import config from "./config";

type DeclaredAccount = {
  name: string;
  tokenHash: string;
};

function accountId(name: string): string {
  const bytes = createHash("sha256").update(`shoutout-service:${name}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function loadDeclarations(): Promise<DeclaredAccount[]> {
  const path = config.SERVICE_ACCOUNTS_FILE;
  if (!path) {
    return [];
  }
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("service account file must be a JSON array");
  }
  return parsed.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("service account entry must be an object");
    }
    const record = item as { name?: unknown; tokenHash?: unknown };
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const tokenHash = typeof record.tokenHash === "string" ? record.tokenHash.trim() : "";
    if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(name)) {
      throw new Error(`invalid service account name: ${name}`);
    }
    if (!/^[a-f0-9]{64}$/.test(tokenHash)) {
      throw new Error(`service account ${name} needs a sha256 tokenHash`);
    }
    return { name, tokenHash };
  });
}

async function applyDeclarations(accounts: DeclaredAccount[]): Promise<void> {
  for (const account of accounts) {
    const id = accountId(account.name);
    await prisma.serviceAccount.upsert({
      where: { name: account.name },
      create: { id, name: account.name },
      update: {},
    });
    const prefix = account.tokenHash.slice(0, 8);
    await prisma.apiKey.upsert({
      where: { hash: account.tokenHash },
      create: {
        owner: id,
        name: account.name,
        prefix,
        hash: account.tokenHash,
        serviceAccountId: id,
      },
      update: {
        revokedAt: null,
        serviceAccountId: id,
        owner: id,
        name: account.name,
      },
    });
    await prisma.apiKey.updateMany({
      where: {
        serviceAccountId: id,
        hash: { not: account.tokenHash },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }
}

let ready: Promise<void> | null = null;

export function ensureServiceAccounts(): Promise<void> {
  if (!ready) {
    ready = loadDeclarations()
      .then((accounts) => applyDeclarations(accounts))
      .catch((error: unknown) => {
        ready = null;
        console.error("service account provisioning failed", error);
      });
  }
  return ready;
}

export async function listUsage(
  serviceAccountId: string,
  from?: Date,
  to?: Date,
) {
  const rows = await prisma.usageEvent.findMany({
    where: {
      serviceAccountId,
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
  });
  const groups = new Map<string, { onBehalfOf: string; jobs: number; files: number; audioSeconds: number }>();
  for (const row of rows) {
    const key = row.onBehalfOf || "";
    const current = groups.get(key) ?? {
      onBehalfOf: key,
      jobs: 0,
      files: 0,
      audioSeconds: 0,
    };
    current.jobs += 1;
    current.files += row.files;
    current.audioSeconds += row.audioSeconds;
    groups.set(key, current);
  }
  return {
    serviceAccountId,
    from: from?.toISOString() ?? null,
    to: to?.toISOString() ?? null,
    groups: Array.from(groups.values()),
  };
}
