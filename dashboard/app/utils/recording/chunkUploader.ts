import { putPresignedObject } from "../file";
import {
  deleteChunk,
  listPendingChunks,
  markChunkUploaded,
  putChunk,
  type RecordingChunkRecord,
} from "./recordingStore";

export type ChunkUploadErrorCode =
  | "NETWORK"
  | "PRESIGN"
  | "UPLOAD"
  | "JOB_NOT_RECORDING"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "UNKNOWN";

export class ChunkUploadError extends Error {
  readonly status: number | null;
  readonly code: ChunkUploadErrorCode;
  readonly retryable: boolean;

  constructor(
    message: string,
    options: {
      status?: number | null;
      code: ChunkUploadErrorCode;
      retryable: boolean;
    }
  ) {
    super(message);
    this.name = "ChunkUploadError";
    this.status = options.status ?? null;
    this.code = options.code;
    this.retryable = options.retryable;
  }
}

export type ChunkUploaderStatus = {
  pendingCount: number;
  uploading: boolean;
  lastError: string | null;
  fatalError: ChunkUploadError | null;
};

type ChunkUploaderOptions = {
  publicId: string;
  onStatusChange?: (status: ChunkUploaderStatus) => void;
  drainTimeoutMs?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyHttpError(
  status: number,
  message: string,
  code?: string
): ChunkUploadError {
  if (status === 409 || code === "JOB_NOT_RECORDING") {
    return new ChunkUploadError(message || "Job is not recording", {
      status,
      code: "JOB_NOT_RECORDING",
      retryable: false,
    });
  }
  if (status === 403 || code === "FORBIDDEN") {
    return new ChunkUploadError(message || "Forbidden", {
      status,
      code: "FORBIDDEN",
      retryable: false,
    });
  }
  if (status === 404 || code === "JOB_NOT_FOUND") {
    return new ChunkUploadError(message || "Job not found", {
      status,
      code: "NOT_FOUND",
      retryable: false,
    });
  }
  if (status === 400 || code === "VALIDATION") {
    return new ChunkUploadError(message || "Invalid request", {
      status,
      code: "VALIDATION",
      retryable: false,
    });
  }
  if (status >= 500 || status === 429) {
    return new ChunkUploadError(message || "Server error", {
      status,
      code: "PRESIGN",
      retryable: true,
    });
  }
  return new ChunkUploadError(message || "Could not presign chunk", {
    status,
    code: "PRESIGN",
    retryable: false,
  });
}

export class ChunkUploader {
  private readonly publicId: string;
  private readonly onStatusChange?: (status: ChunkUploaderStatus) => void;
  private readonly drainTimeoutMs: number;
  private queue: RecordingChunkRecord[] = [];
  private running = false;
  private stopped = false;
  private pendingCount = 0;
  private lastError: string | null = null;
  private fatalError: ChunkUploadError | null = null;
  private onlineHandler: (() => void) | null = null;

  constructor(options: ChunkUploaderOptions) {
    this.publicId = options.publicId;
    this.onStatusChange = options.onStatusChange;
    this.drainTimeoutMs = options.drainTimeoutMs ?? 60_000;
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
    if (this.fatalError) {
      throw this.fatalError;
    }
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
      fatalError: this.fatalError,
    };
  }

  async drain(): Promise<void> {
    const startedAt = Date.now();

    while (true) {
      if (this.fatalError) {
        throw this.fatalError;
      }
      if (this.stopped) {
        throw new ChunkUploadError("Uploader disposed", {
          code: "UNKNOWN",
          retryable: false,
        });
      }
      if (this.queue.length === 0 && !this.running) {
        return;
      }
      if (Date.now() - startedAt > this.drainTimeoutMs) {
        throw new ChunkUploadError("Upload drain timed out", {
          code: "UNKNOWN",
          retryable: true,
        });
      }
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await sleep(500);
        continue;
      }
      await this.pump();
      if (this.queue.length > 0 || this.running) {
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

  private markFatal(error: ChunkUploadError): void {
    this.fatalError = error;
    this.lastError = error.message;
    this.emit();
  }

  private async pump(): Promise<void> {
    if (
      this.running ||
      this.stopped ||
      this.queue.length === 0 ||
      this.fatalError
    ) {
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    this.running = true;
    this.emit();

    while (this.queue.length > 0 && !this.stopped && !this.fatalError) {
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
        if (error instanceof ChunkUploadError && !error.retryable) {
          this.markFatal(error);
          break;
        }
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
    let lastError: Error | null = null;

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
          const body = (await response.json().catch(() => ({}))) as {
            error?: string;
            code?: string;
          };
          throw classifyHttpError(
            response.status,
            body.error ?? "Could not presign chunk",
            body.code
          );
        }
        const { presignedUrl } = (await response.json()) as {
          presignedUrl: string;
        };
        const uploaded = await putPresignedObject(presignedUrl, chunk.blob);
        if (!uploaded.ok) {
          throw new ChunkUploadError("Could not upload chunk", {
            status: uploaded.status,
            code: "UPLOAD",
            retryable: uploaded.status >= 500 || uploaded.status === 0,
          });
        }
        return;
      } catch (error) {
        if (error instanceof ChunkUploadError && !error.retryable) {
          throw error;
        }
        lastError =
          error instanceof Error
            ? error
            : new ChunkUploadError("Upload failed", {
                code: "NETWORK",
                retryable: true,
              });
        if (attempt >= maxAttempts) {
          if (lastError instanceof ChunkUploadError) {
            throw lastError;
          }
          throw new ChunkUploadError(lastError.message, {
            code: "NETWORK",
            retryable: true,
          });
        }
        await sleep(delayMs);
        delayMs = Math.min(delayMs * 2, 8000);
      }
    }

    throw (
      lastError ??
      new ChunkUploadError("Upload failed", {
        code: "UNKNOWN",
        retryable: true,
      })
    );
  }
}
