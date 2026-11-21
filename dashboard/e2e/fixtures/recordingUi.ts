import { expect, type Page } from "@playwright/test";
import {
  endShare,
  installDisplayMediaStub,
  setDisplayMediaVariant,
  type DisplayMediaVariant,
} from "./displayMedia";
import { loginAsE2EUser } from "./auth";
import { registerFakeWorker } from "./worker";

export async function prepareRecordingPage(
  page: Page,
  variant: DisplayMediaVariant = "tab"
): Promise<void> {
  await registerFakeWorker();
  await installDisplayMediaStub(page, variant);
  await loginAsE2EUser(page);
  await expect
    .poll(
      async () => {
        const response = await page.request.get("/api/models");
        if (!response.ok()) {
          return [];
        }
        const data = (await response.json()) as {
          models?: Array<{ model: string }>;
        };
        return data.models ?? [];
      },
      { timeout: 30_000 }
    )
    .toEqual(expect.arrayContaining([expect.objectContaining({ model: "tiny" })]));
  await page.reload();
  const button = await recordButton(page);
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled({ timeout: 30_000 });
}

export async function recordButton(page: Page) {
  return page.getByRole("button", { name: "Record", exact: true }).or(
    page.getByRole("button", { name: "Aufnehmen", exact: true })
  );
}

export async function openRecordingDialog(page: Page): Promise<void> {
  await (await recordButton(page)).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const start = page.getByRole("button", {
    name: /Start recording|Aufnahme starten/i,
  });
  await expect(start).toBeVisible();
  await expect(start).toBeEnabled({ timeout: 30_000 });
}

export async function startRecordingFromDialog(
  page: Page,
  options?: {
    includeDisplay?: boolean;
    includeMic?: boolean;
    variant?: DisplayMediaVariant;
    jobName?: string;
  }
): Promise<string> {
  if (options?.variant) {
    await setDisplayMediaVariant(page, options.variant);
  }

  await openRecordingDialog(page);

  if (options?.jobName) {
    const nameInput = page.getByRole("textbox", { name: /Job name|Jobname/i });
    await nameInput.fill(options.jobName);
  }

  const includeDisplay = options?.includeDisplay ?? true;
  const includeMic = options?.includeMic ?? true;

  const meetingBox = page
    .getByRole("dialog")
    .getByRole("checkbox")
    .nth(0);
  const micBox = page.getByRole("dialog").getByRole("checkbox").nth(1);

  if ((await meetingBox.isChecked()) !== includeDisplay) {
    await meetingBox.click();
  }
  if ((await micBox.isChecked()) !== includeMic) {
    await micBox.click();
  }

  await page
    .getByRole("button", { name: /Start recording|Aufnahme starten/i })
    .click();
  await page.waitForURL(/\/job\/[0-9a-f-]+/, { timeout: 30_000 });
  const match = page.url().match(/\/job\/([0-9a-f-]+)/);
  if (!match?.[1]) {
    throw new Error(`Could not parse job id from ${page.url()}`);
  }
  return match[1];
}

export async function expectNoRecoveryDialog(page: Page): Promise<void> {
  await expect(
    page.getByText(/Unfinished recording|Unvollständige Aufnahme/i)
  ).toHaveCount(0);
}

export function recordingBarStopButton(page: Page) {
  return page
    .locator(".fixed.bottom-4")
    .getByRole("button", {
      name: /Stop & transcribe|Stoppen & transkribieren/i,
    });
}

export async function expectRecordingBar(page: Page): Promise<void> {
  await expect(recordingBarStopButton(page)).toBeVisible();
}

export async function stopAndTranscribe(page: Page): Promise<void> {
  const button = recordingBarStopButton(page);
  await button.click();
  await expect(button).toBeHidden({ timeout: 30_000 });
}

export async function waitForPendingUploadsClear(page: Page): Promise<void> {
  await expect(
    page.getByText(/chunk uploading|Chunks werden hochgeladen/i)
  ).toHaveCount(0, { timeout: 30_000 });
}

export { endShare };
