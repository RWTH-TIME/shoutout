import { putPresignedObject } from "../file";
import {
  deleteChunk,
  listPendingChunks,
  markChunkUploaded,
  putChunk,
  type RecordingChunkRecord,
} from "./recordingStore";

export type ChunkUploaderStatus = {
  pendingCount: number;
  uploading: boolean;
  lastError: string | null;
};

type ChunkUploaderOptions = {
  publicId: string;
  onStatusChange?: (status: ChunkUploaderStatus) => void;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ChunkUploader {
  private readonly publicId: string;
  private readonly onStatusChange?: (status: ChunkUploaderStatus) => void;
  private queue: RecordingChunkRecord[] = [];
  private running = false;
  private stopped = false;
  private pendingCount = 0;
  private lastError: string | null = null;
  private onlineHandler: (() => void) | null = null;

  constructor(options: ChunkUploaderOptions) {
    this.publicId = options.publicId;
    this.onStatusChange = options.onStatusChange;
    this.onlineHandler = () => {
      void this.pump();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.onlineHandler);
    }
  }

  async hydrate(): Promise<void> {
    const pending = await listPendingChunks(this.publicId);
    this.queue = pending;
    this.pendingCount = pending.length;
    this.emit();
    void this.pump();
  }

  async enqueue(chunk: RecordingChunkRecord): Promise<void> {
    await putChunk(chunk);
    this.queue.push(chunk);
    this.pendingCount = this.queue.length;
    this.emit();
    void this.pump();
  }

  getStatus(): ChunkUploaderStatus {
    return {
      pendingCount: this.pendingCount,
      uploading: this.running,
      lastError: this.lastError,
    };
  }

  async drain(): Promise<void> {
    while (this.queue.length > 0 || this.running) {
      if (!navigator.onLine) {
        await sleep(1000);
        continue;
      }
      await this.pump();
      if (this.queue.length > 0) {
        await sleep(200);
      }
    }
  }

  dispose(): void {
    this.stopped = true;
    if (this.onlineHandler && typeof window !== "undefined") {
      window.removeEventListener("online", this.onlineHandler);
    }
  }

  private emit(): void {
    this.onStatusChange?.(this.getStatus());
  }

  private async pump(): Promise<void> {
    if (this.running || this.stopped || this.queue.length === 0) {
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    this.running = true;
    this.emit();

    while (this.queue.length > 0 && !this.stopped) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        break;
      }
      const next = this.queue[0];
      if (!next) {
        break;
      }
      try {
        await this.uploadWithRetry(next);
        await markChunkUploaded(next.publicId, next.sequence);
        await deleteChunk(next.publicId, next.sequence);
        this.queue.shift();
        this.pendingCount = this.queue.length;
        this.lastError = null;
        this.emit();
      } catch (error) {
        this.lastError =
          error instanceof Error ? error.message : "Upload failed";
        this.emit();
        break;
      }
    }

    this.running = false;
    this.emit();
  }

  private async uploadWithRetry(
    chunk: RecordingChunkRecord,
    maxAttempts = 5
  ): Promise<void> {
    let attempt = 0;
    let delayMs = 500;
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        const response = await fetch(
          `/api/jobs/${this.publicId}/recording/chunks`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ sequence: chunk.sequence }),
          }
        );
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? "Could not presign chunk");
        }
        const { presignedUrl } = (await response.json()) as {
          presignedUrl: string;
        };
        const uploaded = await putPresignedObject(presignedUrl, chunk.blob);
        if (!uploaded.ok) {
          throw new Error("Could not upload chunk");
        }
        return;
      } catch (error) {
        if (attempt >= maxAttempts) {
          throw error;
        }
        await sleep(delayMs);
        delayMs = Math.min(delayMs * 2, 8000);
      }
    }
  }
}
