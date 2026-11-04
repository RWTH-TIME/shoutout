import { prisma } from "../lib/prisma";
import config from "../lib/config";

const statuses = ["PENDING", "RUNNING", "FINISHED", "FAILED", "CANCELLED"] as const;

type Sample = {
  labels: Record<string, string>;
  value: number;
};

type JobStatusRow = {
  status: string;
  _count: { _all: number };
};

type JobContentRow = {
  status: string;
  model: string;
  language: string | null;
  visibility: string;
  _count: { _all: number };
};

type ClaimStatsRow = {
  reclaimed: number;
  max_claims: number;
  reclaimed_active: number;
};

type FileContentRow = {
  status: string;
  model: string;
  language: string;
  count: number;
  audio_seconds: number;
};

function escapeLabel(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/"/g, '\\"');
}

function formatLabels(labels: Record<string, string>): string {
  const parts = Object.entries(labels).map(
    ([key, value]) => `${key}="${escapeLabel(value)}"`
  );
  if (parts.length === 0) {
    return "";
  }
  return `{${parts.join(",")}}`;
}

function formatValue(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return Object.is(value, Math.trunc(value)) ? String(value) : String(value);
}

function metric(name: string, help: string, samples: Sample[]): string {
  const lines = [
    `# HELP ${name} ${help}`,
    `# TYPE ${name} gauge`,
    ...samples.map(
      (sample) =>
        `${name}${formatLabels(sample.labels)} ${formatValue(sample.value)}`
    ),
  ];
  return lines.join("\n");
}

function labelOrUnknown(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? "unknown" : trimmed;
}

function addSample(samples: Map<string, Sample>, sample: Sample) {
  const key = JSON.stringify(sample.labels);
  const existing = samples.get(key);
  if (existing) {
    existing.value += sample.value;
    return;
  }
  samples.set(key, { labels: sample.labels, value: sample.value });
}

function samplesFrom(samples: Map<string, Sample>): Sample[] {
  return Array.from(samples.values());
}

function countsByStatus(
  rows: Array<{ status: string; count: number }>
): Sample[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + row.count);
  }
  return statuses.map((status) => ({
    labels: { status },
    value: counts.get(status) ?? 0,
  }));
}

export async function renderMetrics(): Promise<string> {
  const staleBefore = new Date(Date.now() - config.WORKER_HEARTBEAT_STALE_MS);
  const collectedAt = Math.floor(Date.now() / 1000);

  const [
    jobsByStatus,
    jobsByContent,
    fileRows,
    queueFiles,
    oldestPending,
    staleJobs,
    workers,
    activeKeys,
    revokedKeys,
    notificationRows,
    notificationLastRows,
    claimStats,
    oldestRunning,
  ] = await Promise.all([
    prisma.job.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.job.groupBy({
      by: ["status", "model", "language", "visibility"],
      _count: { _all: true },
    }),
    prisma.$queryRaw<FileContentRow[]>`
      SELECT "job"."status"::text AS status,
             "job"."model" AS model,
             COALESCE(
               NULLIF(BTRIM("jobFile"."language"), ''),
               NULLIF(BTRIM("job"."language"), ''),
               'unknown'
             ) AS language,
             COUNT(*)::int AS count,
             COALESCE(SUM("jobFile"."durationSeconds"), 0)::float8 AS audio_seconds
      FROM "jobFile"
      JOIN "job" ON "job"."id" = "jobFile"."jobId"
      GROUP BY 1, 2, 3
    `,
    prisma.jobFile.count({
      where: { job: { status: "PENDING" } },
    }),
    prisma.job.aggregate({
      where: { status: "PENDING" },
      _min: { createdAt: true },
    }),
    prisma.job.count({
      where: {
        status: "RUNNING",
        OR: [{ heartbeatAt: null }, { heartbeatAt: { lt: staleBefore } }],
      },
    }),
    prisma.worker.findMany({
      select: { name: true, models: true, lastSeenAt: true },
    }),
    prisma.apiKey.count({ where: { revokedAt: null } }),
    prisma.apiKey.count({ where: { revokedAt: { not: null } } }),
    prisma.notification.groupBy({
      by: ["kind", "status"],
      _count: { _all: true },
    }),
    prisma.notification.groupBy({
      by: ["kind", "status"],
      _max: { createdAt: true },
    }),
    prisma.$queryRaw<ClaimStatsRow[]>`
      SELECT COUNT(*) FILTER (WHERE "claimCount" > 1)::int AS reclaimed,
             COALESCE(MAX("claimCount"), 0)::int AS max_claims,
             COUNT(*) FILTER (
               WHERE "claimCount" > 1 AND "status" IN ('PENDING', 'RUNNING')
             )::int AS reclaimed_active
      FROM "job"
    `,
    prisma.job.aggregate({
      where: { status: "RUNNING" },
      _min: { claimedAt: true },
    }),
  ]);

  const oldestCreatedAt = oldestPending._min.createdAt;
  const oldestSeconds = oldestCreatedAt
    ? Math.max(0, Math.floor((Date.now() - oldestCreatedAt.getTime()) / 1000))
    : 0;

  const oldestClaimedAt = oldestRunning._min.claimedAt;
  const oldestRunningSeconds = oldestClaimedAt
    ? Math.max(0, Math.floor((Date.now() - oldestClaimedAt.getTime()) / 1000))
    : 0;
  const claims = claimStats[0] ?? {
    reclaimed: 0,
    max_claims: 0,
    reclaimed_active: 0,
  };
  const notificationSamples = notificationRows.map((row) => ({
    labels: { kind: row.kind, status: row.status },
    value: row._count._all,
  }));
  const notificationLastSamples = notificationLastRows
    .filter((row) => row._max.createdAt)
    .map((row) => ({
      labels: { kind: row.kind, status: row.status },
      value: Math.floor((row._max.createdAt as Date).getTime() / 1000),
    }));

  const onlineWorkers = workers.filter(
    (worker) => worker.lastSeenAt.getTime() >= staleBefore.getTime()
  );

  const jobContent = new Map<string, Sample>();
  for (const row of jobsByContent as JobContentRow[]) {
    addSample(jobContent, {
      labels: {
        status: row.status,
        model: labelOrUnknown(row.model),
        language: labelOrUnknown(row.language),
        visibility: row.visibility,
      },
      value: row._count._all,
    });
  }

  const fileContent = new Map<string, Sample>();
  const audioContent = new Map<string, Sample>();
  for (const row of fileRows) {
    const labels = {
      status: row.status,
      model: labelOrUnknown(row.model),
      language: labelOrUnknown(row.language),
    };
    addSample(fileContent, { labels, value: Number(row.count) });
    addSample(audioContent, { labels, value: Number(row.audio_seconds) });
  }

  const workerSeries = new Map<string, Sample>();
  for (const worker of workers) {
    const models = [...worker.models].sort().join(",") || "none";
    const state =
      worker.lastSeenAt.getTime() >= staleBefore.getTime()
        ? "online"
        : "offline";
    const labels = { name: worker.name, state, models };
    const value = Math.floor(worker.lastSeenAt.getTime() / 1000);
    const key = JSON.stringify(labels);
    const existing = workerSeries.get(key);
    if (!existing || value > existing.value) {
      workerSeries.set(key, { labels, value });
    }
  }

  const statusRows = (jobsByStatus as JobStatusRow[]).map((row) => ({
    status: row.status,
    count: row._count._all,
  }));
  const fileStatusRows = samplesFrom(fileContent).map((sample) => ({
    status: sample.labels.status,
    count: sample.value,
  }));

  return [
    metric(
      "shoutout_metrics_collected_unixtime",
      "Unix time of the last successful shoutout metrics collection.",
      [{ labels: {}, value: collectedAt }]
    ),
    metric(
      "shoutout_queue_files",
      "Audio files whose job is still pending.",
      [{ labels: {}, value: queueFiles }]
    ),
    metric(
      "shoutout_queue_oldest_seconds",
      "Age of the oldest pending job.",
      [{ labels: {}, value: oldestSeconds }]
    ),
    metric(
      "shoutout_stale_jobs",
      "Running jobs whose worker heartbeat is missing or older than the claim timeout.",
      [{ labels: {}, value: staleJobs }]
    ),
    metric(
      "shoutout_running_oldest_seconds",
      "Age of the oldest running claim. Alert if far above the longest expected job.",
      [{ labels: {}, value: oldestRunningSeconds }]
    ),
    metric(
      "shoutout_jobs_reclaimed",
      "Jobs claimed more than once (stale heartbeat or worker restart).",
      [
        { labels: { scope: "all" }, value: Number(claims.reclaimed) },
        { labels: { scope: "active" }, value: Number(claims.reclaimed_active) },
      ]
    ),
    metric(
      "shoutout_job_claims_max",
      "Highest number of claims of a single job. Should stay at 1 or 2.",
      [{ labels: {}, value: Number(claims.max_claims) }]
    ),
    metric(
      "shoutout_notifications",
      "Notification mails by kind and status (SENT, FAILED, SKIPPED, PENDING).",
      notificationSamples
    ),
    metric(
      "shoutout_notification_last_unixtime",
      "Unix time of the latest notification by kind and status.",
      notificationLastSamples
    ),
    metric("shoutout_jobs", "Jobs by status.", countsByStatus(statusRows)),
    metric(
      "shoutout_jobs_by_content",
      "Jobs by status, model, language, and visibility.",
      samplesFrom(jobContent)
    ),
    metric(
      "shoutout_job_files",
      "Audio files by job status.",
      countsByStatus(fileStatusRows)
    ),
    metric(
      "shoutout_job_files_by_content",
      "Audio files by job status, model, and language.",
      samplesFrom(fileContent)
    ),
    metric(
      "shoutout_audio_seconds",
      "Audio duration in seconds by job status, model, and language.",
      samplesFrom(audioContent)
    ),
    metric(
      "shoutout_workers_registered",
      "Registered shoutout workers.",
      [{ labels: {}, value: workers.length }]
    ),
    metric(
      "shoutout_workers_online",
      "Workers seen within the heartbeat window.",
      [{ labels: {}, value: onlineWorkers.length }]
    ),
    metric(
      "shoutout_worker_last_seen_seconds",
      "Unix time a worker last checked in.",
      samplesFrom(workerSeries)
    ),
    metric("shoutout_api_keys", "API keys by state.", [
      { labels: { state: "active" }, value: activeKeys },
      { labels: { state: "revoked" }, value: revokedKeys },
    ]),
  ].join("\n") + "\n";
}
