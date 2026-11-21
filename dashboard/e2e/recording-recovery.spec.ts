import { expect, test } from "@playwright/test";
import { getJobByPublicId, waitForJobStatus } from "./fixtures/recordingApi";
import {
  expectNoRecoveryDialog,
  expectRecordingBar,
  prepareRecordingPage,
  startRecordingFromDialog,
} from "./fixtures/recordingUi";
import { applySessionCookie } from "./fixtures/auth";
import { installDisplayMediaStub } from "./fixtures/displayMedia";
import { registerFakeWorker } from "./fixtures/worker";

test.describe("recording recovery", () => {
  test("reload mid-recording shows recovery and can finish", async ({
    page,
  }) => {
    await prepareRecordingPage(page, "tab");
    const publicId = await startRecordingFromDialog(page, {
      variant: "tab",
      jobName: `e2e-recover-${Date.now()}`,
    });
    await expectRecordingBar(page);
    await page.waitForTimeout(2500);

    await page.reload();
    await expect(
      page.getByRole("dialog").getByText(/Unfinished recording|Unvollständige Aufnahme/i)
    ).toBeVisible({ timeout: 15_000 });

    await page
      .getByRole("button", {
        name: /Upload & transcribe|Hochladen & transkribieren/i,
      })
      .click();

    await waitForJobStatus(publicId, "PENDING", 30_000);
    await expect(
      page.getByRole("dialog").getByText(/Unfinished recording|Unvollständige Aufnahme/i)
    ).toHaveCount(0);
  });

  test("reload mid-recording can discard", async ({ page }) => {
    await prepareRecordingPage(page, "tab");
    const publicId = await startRecordingFromDialog(page, {
      variant: "tab",
      jobName: `e2e-discard-${Date.now()}`,
    });
    await expectRecordingBar(page);
    await page.waitForTimeout(1500);
    await page.reload();

    await expect(
      page.getByRole("dialog").getByText(/Unfinished recording|Unvollständige Aufnahme/i)
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("dialog").getByRole("button", { name: /^Discard$|^Verwerfen$/i }).click();

    await expect
      .poll(async () => getJobByPublicId(publicId), { timeout: 15_000 })
      .toBeNull();
  });

  test("second tab does not show recovery while first tab records", async ({
    browser,
  }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await registerFakeWorker();
    await installDisplayMediaStub(pageA, "tab");
    await applySessionCookie(contextA);
    await applySessionCookie(contextB);

    await pageA.goto("/");
    await pageA
      .getByRole("button", { name: "Record", exact: true })
      .or(pageA.getByRole("button", { name: "Aufnehmen", exact: true }))
      .waitFor();
    const publicId = await startRecordingFromDialog(pageA, {
      variant: "tab",
      jobName: `e2e-twotab-${Date.now()}`,
    });
    await expectRecordingBar(pageA);
    await expectNoRecoveryDialog(pageA);

    await pageB.goto(`/job/${publicId}`);
    await expectNoRecoveryDialog(pageB);

    await contextA.close();
    await contextB.close();
  });
});
