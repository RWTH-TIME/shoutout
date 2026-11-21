import { expect, test } from "@playwright/test";
import {
  listRecordingChunkKeys,
  waitForJobStatus,
} from "./fixtures/recordingApi";
import {
  endShare,
  expectNoRecoveryDialog,
  expectRecordingBar,
  openRecordingDialog,
  prepareRecordingPage,
  recordingBarStopButton,
  startRecordingFromDialog,
  stopAndTranscribe,
} from "./fixtures/recordingUi";
import type { DisplayMediaVariant } from "./fixtures/displayMedia";

const successVariants: DisplayMediaVariant[] = ["tab", "screen"];

for (const variant of successVariants) {
  test(`records with ${variant} + mic and finishes`, async ({ page }) => {
    await prepareRecordingPage(page, variant);
    const publicId = await startRecordingFromDialog(page, {
      variant,
      includeDisplay: true,
      includeMic: true,
      jobName: `e2e-${variant}-${Date.now()}`,
    });
    await expectRecordingBar(page);
    await expectNoRecoveryDialog(page);
    await page.waitForTimeout(2500);
    await stopAndTranscribe(page);
    await waitForJobStatus(publicId, "PENDING", 20_000);
  });
}

test("window capture without audio falls back to mic", async ({ page }) => {
  await prepareRecordingPage(page, "window");
  const publicId = await startRecordingFromDialog(page, {
    variant: "window",
    includeDisplay: true,
    includeMic: true,
    jobName: `e2e-window-${Date.now()}`,
  });
  await expect(
    page.getByText(/Continuing with the microphone only|nur mit dem Mikrofon/i)
  ).toBeVisible({ timeout: 10_000 });
  await expectRecordingBar(page);
  await page.waitForTimeout(2500);
  await stopAndTranscribe(page);
  await waitForJobStatus(publicId, "PENDING", 20_000);
});

test("display without audio and without mic shows an error", async ({
  page,
}) => {
  await prepareRecordingPage(page, "screenNoAudio");
  await openRecordingDialog(page);
  const micBox = page.getByRole("dialog").getByRole("checkbox").nth(1);
  if (await micBox.isChecked()) {
    await micBox.click();
  }
  await page.getByRole("button", { name: /Start recording|Aufnahme starten/i }).click();
  await expect(
    page.getByText(/No audio came from the shared surface|kein Audio/i)
  ).toBeVisible({ timeout: 10_000 });
  await expect(page).not.toHaveURL(/\/job\//);
});

test("ending the share mid-recording auto-finishes", async ({ page }) => {
  await prepareRecordingPage(page, "tab");
  const publicId = await startRecordingFromDialog(page, {
    variant: "tab",
    jobName: `e2e-endshare-${Date.now()}`,
  });
  await expectRecordingBar(page);
  await expect
    .poll(async () => (await listRecordingChunkKeys(publicId)).length, {
      timeout: 20_000,
    })
    .toBeGreaterThanOrEqual(1);
  await endShare(page);
  await waitForJobStatus(publicId, "PENDING", 45_000);
  await expect(recordingBarStopButton(page)).toHaveCount(0, {
    timeout: 15_000,
  });
});
