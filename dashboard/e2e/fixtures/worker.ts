export async function registerFakeWorker(options?: {
  baseURL?: string;
  name?: string;
  models?: string[];
}): Promise<{ id: string; token: string }> {
  const baseURL = options?.baseURL ?? process.env.E2E_BASE_URL ?? "http://127.0.0.1:3010";
  const enrollment =
    process.env.WORKER_ENROLLMENT_TOKEN ?? "dev-worker-enrollment-token";

  const response = await fetch(`${baseURL}/api/worker/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${enrollment}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      name: options?.name ?? `e2e-worker-${Date.now()}`,
      models: options?.models ?? ["tiny"],
      info: { e2e: true },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Worker register failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as { id: string; token: string };
  return { id: data.id, token: data.token };
}
