const WEBM_OPUS = "audio/webm;codecs=opus";
const WEBM = "audio/webm";
const MP4 = "audio/mp4";

const CANDIDATES = [WEBM_OPUS, WEBM, MP4] as const;

export type RecorderMimeType = (typeof CANDIDATES)[number] | "";

export function pickRecorderMimeType(): RecorderMimeType {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }
  for (const candidate of CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return "";
}

export function extensionForMimeType(mimeType: string): ".webm" | ".mp4" {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes("mp4") || normalized.includes("mpeg")) {
    return ".mp4";
  }
  return ".webm";
}

export function supportsDisplayAudio(): boolean {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) {
    return false;
  }
  if (typeof navigator.mediaDevices.getDisplayMedia !== "function") {
    return false;
  }
  const ua = navigator.userAgent.toLowerCase();
  const isFirefox = ua.includes("firefox");
  const isSafari =
    ua.includes("safari") &&
    !ua.includes("chrome") &&
    !ua.includes("chromium") &&
    !ua.includes("crios");
  if (isFirefox || isSafari) {
    return false;
  }
  return true;
}

export function supportsMediaRecorder(): boolean {
  return typeof MediaRecorder !== "undefined" && Boolean(pickRecorderMimeType());
}
