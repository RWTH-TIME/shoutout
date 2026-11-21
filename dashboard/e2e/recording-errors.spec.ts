import { expect, test } from "@playwright/test";
import {
  expectRecordingBar,
  prepareRecordingPage,
  recordingBarStopButton,
  startRecordingFromDialog,
} from "./fixtures/recordingUi";

test.describe("recording errors", () => {
  test("permanent chunks failure does not hang stop", async ({ page }) => {
    await prepareRecordingPage(page, "tab");

    await page.route("**/api/jobs/*/recording/chunks", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Job is not recording",
          code: "JOB_NOT_RECORDING",
        }),
      });
    });

    await startRecordingFromDialog(page, {
      variant: "tab",
      jobName: `e2e-err-409-${Date.now()}`,
    });
    await expectRecordingBar(page);
    await page.waitForTimeout(1500);

    const stopButton = recordingBarStopButton(page);
    const started = Date.now();
    await stopButton.click();

    await expect(
      page.getByText(/Job is not recording|Recording failed|Aufnahme fehlgeschlagen/i)
    ).toBeVisible({ timeout: 15_000 });
    expect(Date.now() - started).toBeLessThan(15_000);
  });

  test("transient 5xx on chunks is retried then succeeds", async ({ page }) => {
    await prepareRecordingPage(page, "tab");
    let failures = 0;

    await page.route("**/api/jobs/*/recording/chunks", async (route) => {
      if (failures < 2) {
        failures += 1;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Temporary failure" }),
        });
        return;
      }
      await route.continue();
    });

    const publicId = await startRecordingFromDialog(page, {
      variant: "tab",
      jobName: `e2e-err-5xx-${Date.now()}`,
    });
    await expectRecordingBar(page);
    await page.waitForTimeout(3000);

    const stopButton = recordingBarStopButton(page);
    await stopButton.click();
    await expect(stopButton).toBeHidden({ timeout: 30_000 });
    expect(failures).toBeGreaterThanOrEqual(1);
    expect(publicId).toBeTruthy();
  });
});
