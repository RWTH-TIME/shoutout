import { prisma } from "../lib/prisma";
import config from "../lib/config";
import { compareModelNames } from "../utils/models";

export type AvailableModel = {
  model: string;
  workerCount: number;
};

export async function listAvailableModels(): Promise<AvailableModel[]> {
  const cutoff = new Date(Date.now() - config.WORKER_HEARTBEAT_STALE_MS);
  const workers = await prisma.worker.findMany({
    where: { lastSeenAt: { gte: cutoff } },
    select: { models: true },
  });

  const counts = new Map<string, number>();
  for (const worker of workers) {
    for (const model of worker.models) {
      counts.set(model, (counts.get(model) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([model, workerCount]) => ({ model, workerCount }))
    .sort((a, b) => compareModelNames(a.model, b.model));
}

export async function isModelAvailable(model: string): Promise<boolean> {
  const models = await listAvailableModels();
  return models.some((item) => item.model === model);
}
