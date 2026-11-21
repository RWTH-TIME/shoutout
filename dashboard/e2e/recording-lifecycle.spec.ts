import { expect, test } from "@playwright/test";
import {
  getJobByPublicId,
  listRecordingChunkKeys,
  looksLikeWebm,
  objectExists,
  readObjectBytes,
  waitForJobStatus,
} from "./fixtures/recordingApi";
import {
  expectNoRecoveryDialog,
  expectRecordingBar,
  prepareRecordingPage,
  recordingBarStopButton,
  startRecordingFromDialog,
  stopAndTranscribe,
} from "./fixtures/recordingUi";

test.describe("recording lifecycle", () => {
  test("starts, survives in-app navigation, and stops without hanging", async ({
    page,
  }) => {
    const jobName = `e2e-lifecycle-${Date.now()}`;
    await prepareRecordingPage(page, "tab");
    const publicId = await startRecordingFromDialog(page, {
      variant: "tab",
      jobName,
    });

    await expectRecordingBar(page);
    await expectNoRecoveryDialog(page);

    await expect
      .poll(async () => (await listRecordingChunkKeys(publicId)).length, {
        timeout: 20_000,
      })
      .toBeGreaterThanOrEqual(2);

    await page.getByRole("link", { name: "shoutout" }).click();
    await expect(page).toHaveURL("/");
    await expectRecordingBar(page);
    await expectNoRecoveryDialog(page);

    await page.getByRole("link", { name: /Settings|Einstellungen/i }).click();
    await expect(page).toHaveURL(/\/settings/);
    await expectRecordingBar(page);
    await expectNoRecoveryDialog(page);

    await page.getByRole("button", { name: new RegExp(jobName) }).click();
    await expect(page).toHaveURL(new RegExp(`/job/${publicId}`));
    await expectRecordingBar(page);
    await expectNoRecoveryDialog(page);

    const stopStarted = Date.now();
    await stopAndTranscribe(page);
    expect(Date.now() - stopStarted).toBeLessThan(20_000);

    await expect(recordingBarStopButton(page)).toHaveCount(0);

    const job = await waitForJobStatus(publicId, "PENDING", 20_000);
    expect(job.status).toBe("PENDING");

    const audioKey = `to-transcribe/${job.files[0]?.audioFile}`;
    expect(await objectExists(audioKey)).toBe(true);
    const bytes = await readObjectBytes(audioKey);
    expect(bytes.byteLength).toBeGreaterThan(100);
    expect(looksLikeWebm(bytes)).toBe(true);

    const leftover = await listRecordingChunkKeys(publicId);
    expect(leftover).toHaveLength(0);

    const refreshed = await getJobByPublicId(publicId);
    expect(refreshed?.status).toBe("PENDING");
  });
});
