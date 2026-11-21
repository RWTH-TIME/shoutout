import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const PORT = Number(process.env.E2E_PORT ?? "3010");
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const CHROMIUM_PATH =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
  process.env.CHROMIUM_PATH ??
  "/etc/profiles/per-user/worker/bin/chromium";

export default defineConfig({
  testDir: path.join(__dirname, "e2e"),
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 20_000,
  },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "off",
    launchOptions: {
      executablePath: CHROMIUM_PATH,
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        "--autoplay-policy=no-user-gesture-required",
        "--disable-web-security",
      ],
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: undefined,
        permissions: ["microphone", "camera"],
      },
    },
  ],
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: `npx next start -p ${PORT} -H 127.0.0.1`,
        url: `${BASE_URL}/auth`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          PORT: String(PORT),
          NEXTAUTH_URL: BASE_URL,
          NEXTAUTH_SECRET:
            process.env.NEXTAUTH_SECRET ?? "e2e-recording-secret",
          DATABASE_URL:
            process.env.DATABASE_URL ??
            "postgresql://admin:admin@localhost:5433/postgres?schema=public",
          S3_ENDPOINT: process.env.S3_ENDPOINT ?? "http://localhost:3900",
          S3_PUBLIC_ENDPOINT:
            process.env.S3_PUBLIC_ENDPOINT ?? "http://localhost:3900",
          S3_WORKER_ENDPOINT:
            process.env.S3_WORKER_ENDPOINT ?? "http://localhost:3900",
          S3_REGION: process.env.S3_REGION ?? "garage",
          S3_BUCKET: process.env.S3_BUCKET ?? "shoutout-job-bucket",
          WORKER_ENROLLMENT_TOKEN:
            process.env.WORKER_ENROLLMENT_TOKEN ??
            "dev-worker-enrollment-token",
          MAIL_ENABLED: "false",
        },
      },
});
