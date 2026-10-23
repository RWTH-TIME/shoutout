import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z
    .string()
    .default("postgresql://admin:admin@localhost:5433/postgres?schema=public"),
  S3_ENDPOINT: z.string().default("http://localhost:3900"),
  S3_PUBLIC_ENDPOINT: z.string().default("http://localhost:3900"),
  S3_WORKER_ENDPOINT: z.string().default("http://localhost:3900"),
  S3_REGION: z.string().default("garage"),
  S3_ACCESS_KEY_ID: z.string().default("shoutoutdevuser"),
  S3_SECRET_ACCESS_KEY: z.string().default("shoutoutdevuser"),
  S3_BUCKET: z.string().default("shoutout-job-bucket"),
  UPLOAD_FILE_TARGET_DIR: z.string().default("to-transcribe/"),
  DOWNLOAD_FILE_TARGET_DIR: z.string().default("finished-files/"),
  FINISHED_FILE_FORMAT: z.string().default(".zip"),
  WORKER_ENROLLMENT_TOKEN: z.string().default("dev-worker-enrollment-token"),
  WORKER_HEARTBEAT_STALE_MS: z.coerce.number().default(90_000),
  WORKER_MAX_ATTEMPTS: z.coerce.number().default(3),
  CLAIM_POLL_MS: z.coerce.number().default(25_000),
  LISTMONK_URL: z.string().optional().default(""),
  LISTMONK_USERNAME: z.string().optional().default(""),
  LISTMONK_TOKEN: z.string().optional().default(""),
  LISTMONK_TEMPLATE_ID: z.coerce.number().optional().default(0),
  JOB_EXPIRATION_DAYS: z.coerce.number().default(14),
  OIDC_PROVIDER: z.string().default("http://localhost:8090/realms/main"),
  OIDC_INTERNAL_PROVIDER: z
    .string()
    .default("http://localhost:8090/realms/main"),
  OIDC_CLIENT_ID: z.string().default("shoutout"),
  OIDC_CLIENT_SECRET: z.string().default("shoutout-client-secret"),
  OIDC_REDIRECT_URI: z
    .string()
    .default("http://localhost:3000/api/auth/callback/keycloak"),
  NEXTAUTH_SECRET: z.string().default("random-auth-secret"),
  NEXTAUTH_URL: z.string().default("http://localhost:3000"),
});

const env = {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_PUBLIC_ENDPOINT: process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT,
  S3_WORKER_ENDPOINT:
    process.env.S3_WORKER_ENDPOINT ||
    process.env.S3_ENDPOINT ||
    process.env.S3_PUBLIC_ENDPOINT,
  S3_REGION: process.env.S3_REGION,
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  S3_BUCKET: process.env.S3_BUCKET,
  UPLOAD_FILE_TARGET_DIR: process.env.UPLOAD_FILE_TARGET_DIR,
  DOWNLOAD_FILE_TARGET_DIR: process.env.DOWNLOAD_FILE_TARGET_DIR,
  FINISHED_FILE_FORMAT: process.env.FINISHED_FILE_FORMAT,
  WORKER_ENROLLMENT_TOKEN: process.env.WORKER_ENROLLMENT_TOKEN,
  WORKER_HEARTBEAT_STALE_MS: process.env.WORKER_HEARTBEAT_STALE_MS,
  WORKER_MAX_ATTEMPTS: process.env.WORKER_MAX_ATTEMPTS,
  CLAIM_POLL_MS: process.env.CLAIM_POLL_MS,
  LISTMONK_URL: process.env.LISTMONK_URL,
  LISTMONK_USERNAME: process.env.LISTMONK_USERNAME,
  LISTMONK_TOKEN: process.env.LISTMONK_TOKEN,
  LISTMONK_TEMPLATE_ID: process.env.LISTMONK_TEMPLATE_ID,
  JOB_EXPIRATION_DAYS:
    process.env.JOB_EXPIRATION_DAYS === "" ||
    process.env.JOB_EXPIRATION_DAYS === undefined
      ? "14"
      : process.env.JOB_EXPIRATION_DAYS,
  OIDC_PROVIDER: process.env.OIDC_PROVIDER,
  OIDC_INTERNAL_PROVIDER:
    process.env.OIDC_INTERNAL_PROVIDER || process.env.OIDC_PROVIDER,
  OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
  OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET,
  OIDC_REDIRECT_URI: process.env.OIDC_REDIRECT_URI,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
};

export type AppConfig = z.infer<typeof schema>;

const config: AppConfig = schema.parse(env);

export default config;
