import type { Page } from "@playwright/test";

export type DisplayMediaVariant =
  | "tab"
  | "window"
  | "screen"
  | "screenNoAudio";

declare global {
  interface Window {
    __endShare?: () => void;
    __displayMediaVariant?: DisplayMediaVariant;
  }
}

export async function installDisplayMediaStub(
  page: Page,
  variant: DisplayMediaVariant = "tab"
): Promise<void> {
  await page.addInitScript((selectedVariant) => {
    window.__displayMediaVariant = selectedVariant as DisplayMediaVariant;

    function createToneTracks(includeAudio: boolean): MediaStreamTrack[] {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#1d4ed8";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      const videoStream = canvas.captureStream(5);
      const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];

      if (includeAudio) {
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        oscillator.frequency.value = 440;
        const destination = audioContext.createMediaStreamDestination();
        oscillator.connect(destination);
        oscillator.start();
        tracks.push(...destination.stream.getAudioTracks());
      }
      return tracks;
    }

    const originalGetUserMedia =
      navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

    navigator.mediaDevices.getUserMedia = async (constraints) => {
      if (constraints && typeof constraints === "object" && constraints.audio) {
        const tracks = createToneTracks(true).filter(
          (track) => track.kind === "audio"
        );
        return new MediaStream(tracks);
      }
      return originalGetUserMedia(constraints);
    };

    navigator.mediaDevices.getDisplayMedia = async () => {
      const current = window.__displayMediaVariant ?? "tab";
      const withAudio = current === "tab" || current === "screen";
      const tracks = createToneTracks(withAudio);
      const stream = new MediaStream(tracks);
      window.__endShare = () => {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            return;
          }
          try {
            track.dispatchEvent(new Event("ended"));
          } catch {
            return;
          }
        });
      };
      return stream;
    };
  }, variant);

  await page.addInitScript((selectedVariant) => {
    window.__displayMediaVariant = selectedVariant as DisplayMediaVariant;
  }, variant);
}

export async function setDisplayMediaVariant(
  page: Page,
  variant: DisplayMediaVariant
): Promise<void> {
  await page.evaluate((value) => {
    window.__displayMediaVariant = value as DisplayMediaVariant;
  }, variant);
}

export async function endShare(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__endShare?.();
  });
}
