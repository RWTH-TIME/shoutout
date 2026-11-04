import { Prisma, type job } from "@prisma/client";
import config from "./config";
import { prisma } from "./prisma";
import type { NotificationSettings } from "../services/userSettingsService";

type NotifyPayload = {
  kind: "finished" | "failed";
  job: Pick<
    job,
    | "id"
    | "name"
    | "model"
    | "publicId"
    | "notifyEmail"
    | "notifyEnabled"
    | "owner"
    | "error"
    | "resultToken"
  >;
  settings: NotificationSettings;
};

const NOTIFY_TIMEOUT_MS = 10_000;

function resolveRecipient(payload: NotifyPayload): string | null {
  if (!payload.job.notifyEnabled) {
    return null;
  }
  if (payload.kind === "finished" && !payload.settings.notifyOnFinish) {
    return null;
  }
  if (payload.kind === "failed" && !payload.settings.notifyOnFail) {
    return null;
  }
  return payload.job.notifyEmail || payload.settings.notifyEmail || null;
}

function skipReason(notifyEmail: string | null): string | null {
  if (!notifyEmail) {
    return "no recipient or notifications disabled";
  }
  if (
    !config.MAIL_ENABLED ||
    !config.LISTMONK_URL ||
    !config.LISTMONK_USERNAME ||
    !config.LISTMONK_TOKEN ||
    !config.LISTMONK_TEMPLATE_ID
  ) {
    return "mail not configured";
  }
  return null;
}

function maskEmail(email: string | null): string | null {
  if (!email) {
    return null;
  }
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}***@${domain ?? ""}`;
}

function logEvent(
  event: string,
  payload: NotifyPayload,
  recipient: string | null,
  extra: Record<string, unknown> = {}
) {
  const line = JSON.stringify({
    event,
    kind: payload.kind,
    jobId: payload.job.id,
    publicId: payload.job.publicId,
    recipient: maskEmail(recipient),
    ...extra,
  });
  if (event === "notification_failed") {
    console.error(line);
  } else if (event === "notification_duplicate_suppressed") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

/**
 * Reserve the single notification slot for this job and event. The unique
 * dedupeKey guarantees at most one mail per job and kind, whichever code path
 * triggers it and however often.
 */
async function reserve(
  payload: NotifyPayload,
  recipient: string | null,
  skipped: string | null
): Promise<string | null> {
  try {
    const row = await prisma.notification.create({
      data: {
        dedupeKey: `${payload.job.publicId}:${payload.kind}`,
        jobId: payload.job.id,
        kind: payload.kind,
        status: skipped ? "SKIPPED" : "PENDING",
        recipient,
        error: skipped,
      },
    });
    return row.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      logEvent("notification_duplicate_suppressed", payload, recipient);
      return null;
    }
    throw error;
  }
}

async function finish(id: string, status: "SENT" | "FAILED", error?: string) {
  await prisma.notification.update({
    where: { id },
    data: { status, error: error ?? null },
  });
}

export async function notifyJobEvent(payload: NotifyPayload): Promise<void> {
  let reservation: string | null = null;
  const notifyEmail = resolveRecipient(payload);
  try {
    const skipped = skipReason(notifyEmail);
    reservation = await reserve(payload, notifyEmail, skipped);
    if (!reservation) {
      return;
    }
    if (skipped) {
      logEvent("notification_skipped", payload, notifyEmail, { reason: skipped });
      return;
    }
    if (!notifyEmail) {
      return;
    }

    const baseUrl = config.NEXTAUTH_URL.replace(/\/$/, "");
    const jobUrl = `${baseUrl}/job/${payload.job.publicId}`;
    const downloadUrl = payload.job.resultToken
      ? `${baseUrl}/api/downloads/${payload.job.resultToken}`
      : null;
    const logoUrl = `${baseUrl}/mail-logo.png`;
    const url = `${config.LISTMONK_URL.replace(/\/$/, "")}/api/tx`;
    const auth = Buffer.from(
      `${config.LISTMONK_USERNAME}:${config.LISTMONK_TOKEN}`
    ).toString("base64");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NOTIFY_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriber_mode: "external",
          subscriber_email: notifyEmail,
          content_type: "html",
          template_id: config.LISTMONK_TEMPLATE_ID,
          data: {
            kind: payload.kind,
            jobName: payload.job.name,
            model: payload.job.model,
            jobUrl,
            downloadUrl,
            logoUrl,
            error: payload.job.error ?? null,
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        const message = `listmonk ${response.status}: ${body.slice(0, 500)}`;
        await finish(reservation, "FAILED", message);
        logEvent("notification_failed", payload, notifyEmail, { error: message });
        return;
      }
      await finish(reservation, "SENT");
      logEvent("notification_sent", payload, notifyEmail);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logEvent("notification_failed", payload, notifyEmail, { error: message });
    if (reservation) {
      await finish(reservation, "FAILED", message).catch(() => undefined);
    }
  }
}
