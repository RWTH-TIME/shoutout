import type { job } from "@prisma/client";
import config from "./config";
import type { NotificationSettings } from "../services/userSettingsService";

type NotifyPayload = {
  kind: "finished" | "failed";
  job: Pick<
    job,
    | "name"
    | "model"
    | "publicId"
    | "notifyEmail"
    | "notifyEnabled"
    | "owner"
    | "error"
  >;
  settings: NotificationSettings;
};

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
  return (
    payload.job.notifyEmail ||
    payload.settings.notifyEmail ||
    null
  );
}

export async function notifyJobEvent(payload: NotifyPayload): Promise<void> {
  const notifyEmail = resolveRecipient(payload);
  if (
    !config.MAIL_ENABLED ||
    !config.LISTMONK_URL ||
    !config.LISTMONK_USERNAME ||
    !config.LISTMONK_TOKEN ||
    !config.LISTMONK_TEMPLATE_ID ||
    !notifyEmail
  ) {
    return;
  }

  const jobUrl = `${config.NEXTAUTH_URL.replace(/\/$/, "")}/job/${payload.job.publicId}`;
  const url = `${config.LISTMONK_URL.replace(/\/$/, "")}/api/tx`;
  const auth = Buffer.from(
    `${config.LISTMONK_USERNAME}:${config.LISTMONK_TOKEN}`
  ).toString("base64");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriber_email: notifyEmail,
        template_id: config.LISTMONK_TEMPLATE_ID,
        data: {
          kind: payload.kind,
          jobName: payload.job.name,
          model: payload.job.model,
          jobUrl,
          downloadUrl: jobUrl,
          error: payload.job.error ?? null,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Listmonk notification failed", response.status, body);
    }
  } catch (error) {
    console.error("Listmonk notification error", error);
  }
}
