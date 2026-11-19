export class DisplayAudioUnavailableError extends Error {
  constructor(message = "Selected surface has no audio track") {
    super(message);
    this.name = "DisplayAudioUnavailableError";
  }
}

type DisplayAudioConstraints = MediaTrackConstraints & {
  systemAudio?: "include" | "exclude";
  selfBrowserSurface?: "include" | "exclude";
  suppressLocalAudioPlayback?: boolean;
};

export async function captureDisplayAudio(): Promise<MediaStream> {
  const audioConstraints: DisplayAudioConstraints = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    systemAudio: "include",
    suppressLocalAudioPlayback: false,
  };

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: audioConstraints,
    // @ts-expect-error Chromium-only DisplayMediaStreamOptions fields
    systemAudio: "include",
    selfBrowserSurface: "exclude",
    preferCurrentTab: false,
  });

  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) {
    stream.getTracks().forEach((track) => track.stop());
    throw new DisplayAudioUnavailableError();
  }

  return stream;
}

export async function captureMicrophone(
  deviceId?: string
): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    },
    video: false,
  });
}

export type MicrophoneDevice = {
  deviceId: string;
  label: string;
};

export async function listMicrophones(): Promise<MicrophoneDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "audioinput")
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Microphone ${index + 1}`,
    }));
}

export function stopStream(stream: MediaStream | null | undefined): void {
  if (!stream) {
    return;
  }
  stream.getTracks().forEach((track) => track.stop());
}
