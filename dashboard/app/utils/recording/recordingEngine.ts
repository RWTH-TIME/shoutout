import { createAudioMixer, type AudioMixer } from "./audioMixer";
import { audioOnlyStream, stopStream } from "./captureSources";
import {
  ChunkUploadError,
  ChunkUploader,
  type ChunkUploaderStatus,
} from "./chunkUploader";
import {
  extensionForMimeType,
  pickRecorderMimeType,
} from "./mediaSupport";
import {
  deleteSession,
  getSession,
  listPendingChunks,
  listSessions,
  putSession,
  type RecordingSession,
} from "./recordingStore";
import {
  acquireRecordingLock,
  tryPeekRecordingLock,
  type RecordingLockHandle,
} from "./sessionLock";

export const DISPLAY_SOURCE_ID = "display";
export const MIC_SOURCE_ID = "mic";

const TIMESLICE_MS = 1000;

export type RecordingEngineStatus = {
  state: "idle" | "recording" | "stopping" | "error";
  publicId: string | null;
  startedAt: number | null;
  elapsedSeconds: number;
  pendingUploads: number;
  micMuted: boolean;
  error: string | null;
  displayAnalyser: AnalyserNode | null;
  micAnalyser: AnalyserNode | null;
};

type StartOptions = {
  publicId: string;
  jobName: string;
  displayStream: MediaStream | null;
  micStream: MediaStream | null;
  mimeType?: string;
};

type StopResult = {
  chunkCount: number;
  durationSeconds: number;
};

type StatusListener = (status: RecordingEngineStatus) => void;

export class RecordingEngine {
  private mixer: AudioMixer | null = null;
  private recorder: MediaRecorder | null = null;
  private uploader: ChunkUploader | null = null;
  private displayStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private publicId: string | null = null;
  private jobName: string | null = null;
  private mimeType = "";
  private nextSequence = 0;
  private startedAt: number | null = null;
  private state: RecordingEngineStatus["state"] = "idle";
  private micMuted = false;
  private error: string | null = null;
  private pendingUploads = 0;
  private listeners = new Set<StatusListener>();
  private elapsedTimer: ReturnType<typeof setInterval> | null = null;
  private trackEndedHandlers: Array<() => void> = [];
  private stopPromise: Promise<StopResult> | null = null;
  private autoFinishOnTrackEnd = true;
  private dataAvailableChain: Promise<void> = Promise.resolve();
  private lockHandle: RecordingLockHandle | null = null;

  subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getStatus(): RecordingEngineStatus {
    return {
      state: this.state,
      publicId: this.publicId,
      startedAt: this.startedAt,
      elapsedSeconds: this.startedAt
        ? Math.max(0, Math.floor((Date.now() - this.startedAt) / 1000))
        : 0,
      pendingUploads: this.pendingUploads,
      micMuted: this.micMuted,
      error: this.error,
      displayAnalyser: this.mixer?.getAnalyser(DISPLAY_SOURCE_ID) ?? null,
      micAnalyser: this.mixer?.getAnalyser(MIC_SOURCE_ID) ?? null,
    };
  }

  async start(options: StartOptions): Promise<void> {
    if (this.state === "recording" || this.state === "stopping") {
      throw new Error("Recording already in progress");
    }

    const mimeType = options.mimeType || pickRecorderMimeType();
    if (!mimeType) {
      throw new Error("MediaRecorder is not supported in this browser");
    }
    if (!options.displayStream && !options.micStream) {
      throw new Error("At least one audio source is required");
    }

    const lock = await acquireRecordingLock(options.publicId);
    if (!lock) {
      throw new Error("Recording is already active in another tab");
    }
    this.lockHandle = lock;

    this.publicId = options.publicId;
    this.jobName = options.jobName;
    this.mimeType = mimeType;
    this.displayStream = options.displayStream;
    this.micStream = options.micStream;
    this.nextSequence = 0;
    this.startedAt = Date.now();
    this.state = "recording";
    this.error = null;
    this.micMuted = false;
    this.autoFinishOnTrackEnd = true;

    const mixerInputs: Array<{ id: string; stream: MediaStream }> = [];
    if (options.displayStream?.getAudioTracks().length) {
      mixerInputs.push({
        id: DISPLAY_SOURCE_ID,
        stream: audioOnlyStream(options.displayStream),
      });
    }
    if (options.micStream) {
      mixerInputs.push({ id: MIC_SOURCE_ID, stream: options.micStream });
    }
    if (mixerInputs.length === 0) {
      this.releaseLock();
      throw new Error("At least one audio source is required");
    }

    this.mixer = createAudioMixer(mixerInputs);
    if (this.mixer.context.state === "suspended") {
      await this.mixer.context.resume();
    }

    this.uploader = new ChunkUploader({
      publicId: options.publicId,
      onStatusChange: (status: ChunkUploaderStatus) => {
        this.pendingUploads = status.pendingCount;
        if (status.fatalError) {
          this.error = status.fatalError.message;
          if (this.state === "recording") {
            this.state = "error";
          }
        } else if (status.lastError) {
          this.error = status.lastError;
        }
        this.emit();
      },
    });

    await putSession({
      publicId: options.publicId,
      mimeType,
      startedAt: this.startedAt,
      nextSequence: 0,
      state: "recording",
      jobName: options.jobName,
    });

    this.recorder = new MediaRecorder(this.mixer.destination.stream, {
      mimeType,
    });
    this.recorder.ondataavailable = (event) => {
      this.dataAvailableChain = this.dataAvailableChain
        .then(() => this.handleDataAvailable(event.data))
        .catch((error) => {
          this.error =
            error instanceof Error ? error.message : "Chunk handling failed";
          if (error instanceof ChunkUploadError && !error.retryable) {
            this.state = "error";
          }
          this.emit();
        });
    };
    this.recorder.onerror = () => {
      this.error = "Recorder failed";
      this.state = "error";
      this.emit();
    };

    this.attachTrackEndedHandlers();
    this.recorder.start(TIMESLICE_MS);
    this.elapsedTimer = setInterval(() => this.emit(), 1000);
    this.emit();
  }

  setMicMuted(muted: boolean): void {
    this.micMuted = muted;
    this.mixer?.setGain(MIC_SOURCE_ID, muted ? 0 : 1);
    this.emit();
  }

  async stop(): Promise<StopResult> {
    if (this.stopPromise) {
      return this.stopPromise;
    }
    this.stopPromise = this.stopInternal(true);
    try {
      return await this.stopPromise;
    } finally {
      this.stopPromise = null;
    }
  }

  async finishRemote(
    chunkCount: number,
    durationSeconds: number
  ): Promise<void> {
    if (!this.publicId) {
      throw new Error("No active recording");
    }
    const response = await fetch(
      `/api/jobs/${this.publicId}/recording/finish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ chunkCount, durationSeconds }),
      }
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? "Could not finish recording");
    }
    await deleteSession(this.publicId);
    this.releaseLock();
    this.resetLocal();
  }

  async discardRemote(): Promise<void> {
    if (!this.publicId) {
      return;
    }
    const publicId = this.publicId;
    this.autoFinishOnTrackEnd = false;
    await this.stopInternal(false);
    await fetch(`/api/jobs/${publicId}`, { method: "DELETE" }).catch(
      () => undefined
    );
    await deleteSession(publicId);
    this.releaseLock();
    this.resetLocal();
  }

  static async listRecoverableSessions(
    activePublicId?: string | null
  ): Promise<RecordingSession[]> {
    const sessions = await listSessions();
    const candidates = sessions.filter(
      (session) =>
        (session.state === "recording" || session.state === "finishing") &&
        session.publicId !== activePublicId
    );

    const recoverable: RecordingSession[] = [];
    for (const session of candidates) {
      const heldElsewhere = await tryPeekRecordingLock(session.publicId);
      if (!heldElsewhere) {
        recoverable.push(session);
      }
    }
    return recoverable;
  }

  static async recoverAndFinish(publicId: string): Promise<void> {
    const session = await getSession(publicId);
    if (!session) {
      throw new Error("Session not found");
    }

    const lock = await acquireRecordingLock(publicId);
    if (!lock) {
      throw new Error("Recording is already active in another tab");
    }

    try {
      await putSession({ ...session, state: "finishing" });

      const uploader = new ChunkUploader({ publicId });
      await uploader.hydrate();
      await uploader.drain();
      uploader.dispose();

      const pending = await listPendingChunks(publicId);
      if (pending.length > 0) {
        throw new Error("Some recording chunks could not be uploaded");
      }

      const chunkCount = session.nextSequence;
      if (chunkCount <= 0) {
        throw new Error("No recording chunks to finish");
      }

      const response = await fetch(`/api/jobs/${publicId}/recording/finish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          chunkCount,
          durationSeconds: Math.max(0, (Date.now() - session.startedAt) / 1000),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not finish recording");
      }
      await deleteSession(publicId);
    } finally {
      lock.release();
    }
  }

  static async discardSession(publicId: string): Promise<void> {
    await fetch(`/api/jobs/${publicId}`, { method: "DELETE" }).catch(
      () => undefined
    );
    await deleteSession(publicId);
  }

  static extensionForMimeType = extensionForMimeType;
  static pickRecorderMimeType = pickRecorderMimeType;

  private async stopInternal(waitForUploads: boolean): Promise<StopResult> {
    if (this.state !== "recording" && this.state !== "error") {
      return {
        chunkCount: this.nextSequence,
        durationSeconds: this.startedAt
          ? Math.max(0, (Date.now() - this.startedAt) / 1000)
          : 0,
      };
    }

    this.state = "stopping";
    this.emit();
    this.clearElapsedTimer();
    this.detachTrackEndedHandlers();

    const recorder = this.recorder;
    if (recorder && recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        recorder.addEventListener("stop", () => resolve(), { once: true });
        recorder.stop();
      });
      await this.dataAvailableChain;
    }

    if (waitForUploads && this.uploader) {
      try {
        await this.uploader.drain();
      } catch (error) {
        stopStream(this.displayStream);
        stopStream(this.micStream);
        this.mixer?.dispose();
        this.uploader?.dispose();
        this.recorder = null;
        this.mixer = null;
        this.uploader = null;
        this.displayStream = null;
        this.micStream = null;
        this.state = "error";
        this.error =
          error instanceof Error ? error.message : "Upload failed";
        this.emit();
        throw error;
      }
    }

    stopStream(this.displayStream);
    stopStream(this.micStream);
    this.mixer?.dispose();
    this.uploader?.dispose();
    this.recorder = null;
    this.mixer = null;
    this.uploader = null;
    this.displayStream = null;
    this.micStream = null;

    const durationSeconds = this.startedAt
      ? Math.max(0, (Date.now() - this.startedAt) / 1000)
      : 0;

    if (this.publicId) {
      await putSession({
        publicId: this.publicId,
        mimeType: this.mimeType,
        startedAt: this.startedAt ?? Date.now(),
        nextSequence: this.nextSequence,
        state: "finishing",
        jobName: this.jobName ?? "recording",
      });
    }

    return {
      chunkCount: this.nextSequence,
      durationSeconds,
    };
  }

  private releaseLock(): void {
    this.lockHandle?.release();
    this.lockHandle = null;
  }

  private resetLocal(): void {
    this.clearElapsedTimer();
    this.detachTrackEndedHandlers();
    this.releaseLock();
    this.publicId = null;
    this.jobName = null;
    this.mimeType = "";
    this.nextSequence = 0;
    this.startedAt = null;
    this.state = "idle";
    this.error = null;
    this.pendingUploads = 0;
    this.micMuted = false;
    this.emit();
  }

  private async handleDataAvailable(data: Blob): Promise<void> {
    if (!this.publicId || !data || data.size === 0 || !this.uploader) {
      return;
    }
    if (this.uploader.getStatus().fatalError) {
      return;
    }
    const sequence = this.nextSequence;
    this.nextSequence += 1;
    await putSession({
      publicId: this.publicId,
      mimeType: this.mimeType,
      startedAt: this.startedAt ?? Date.now(),
      nextSequence: this.nextSequence,
      state: this.state === "stopping" ? "finishing" : "recording",
      jobName: this.jobName ?? "recording",
    });
    await this.uploader.enqueue({
      publicId: this.publicId,
      sequence,
      blob: data,
      uploaded: false,
    });
  }

  private attachTrackEndedHandlers(): void {
    const onEnded = () => {
      if (!this.autoFinishOnTrackEnd || this.state !== "recording") {
        return;
      }
      void this.stop()
        .then(async ({ chunkCount, durationSeconds }) => {
          if (chunkCount <= 0) {
            this.error = "Recording produced no audio";
            this.state = "error";
            this.emit();
            return;
          }
          await this.finishRemote(chunkCount, durationSeconds);
        })
        .catch((error) => {
          this.error =
            error instanceof Error ? error.message : "Finish failed";
          this.state = "error";
          this.emit();
        });
    };

    const watchedStreams = this.displayStream
      ? [this.displayStream]
      : this.micStream
        ? [this.micStream]
        : [];

    for (const stream of watchedStreams) {
      for (const track of stream.getTracks()) {
        const handler = () => onEnded();
        track.addEventListener("ended", handler);
        this.trackEndedHandlers.push(() =>
          track.removeEventListener("ended", handler)
        );
      }
    }
  }

  private detachTrackEndedHandlers(): void {
    for (const remove of this.trackEndedHandlers) {
      remove();
    }
    this.trackEndedHandlers = [];
  }

  private clearElapsedTimer(): void {
    if (this.elapsedTimer) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }
  }

  private emit(): void {
    const status = this.getStatus();
    Array.from(this.listeners).forEach((listener) => {
      listener(status);
    });
  }
}
