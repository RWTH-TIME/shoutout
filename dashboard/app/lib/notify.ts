import config from "./config";

type NotifyPayload = {
  jobName: string;
  model: string;
  downloadUrl: string;
  notifyEmail: string | null | undefined;
};

export async function notifyJobReady(payload: NotifyPayload): Promise<void> {
  if (
    !config.LISTMONK_URL ||
    !config.LISTMONK_USERNAME ||
    !config.LISTMONK_TOKEN ||
    !config.LISTMONK_TEMPLATE_ID ||
    !payload.notifyEmail
  ) {
    return;
  }

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
        subscriber_email: payload.notifyEmail,
        template_id: config.LISTMONK_TEMPLATE_ID,
        data: {
          jobName: payload.jobName,
          model: payload.model,
          downloadUrl: payload.downloadUrl,
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
