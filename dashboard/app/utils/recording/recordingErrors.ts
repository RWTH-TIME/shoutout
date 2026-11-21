import { NextResponse } from "next/server";
import { ZodError } from "zod";

export const RECORDING_ERROR_CODES = {
  JOB_NOT_RECORDING: "JOB_NOT_RECORDING",
  JOB_NOT_FOUND: "JOB_NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  VALIDATION: "VALIDATION",
  CONFLICT: "CONFLICT",
} as const;

export type RecordingErrorCode =
  (typeof RECORDING_ERROR_CODES)[keyof typeof RECORDING_ERROR_CODES];

export class RecordingError extends Error {
  readonly status: number;
  readonly code: RecordingErrorCode;

  constructor(message: string, status: number, code: RecordingErrorCode) {
    super(message);
    this.name = "RecordingError";
    this.status = status;
    this.code = code;
  }
}

export function recordingErrorResponse(error: unknown): NextResponse {
  if (error instanceof RecordingError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        code: RECORDING_ERROR_CODES.VALIDATION,
        details: error.flatten(),
      },
      { status: 400 }
    );
  }

  const message = error instanceof Error ? error.message : "Failed";

  if (message === "Forbidden") {
    return NextResponse.json(
      { error: message, code: RECORDING_ERROR_CODES.FORBIDDEN },
      { status: 403 }
    );
  }
  if (message === "Job not found") {
    return NextResponse.json(
      { error: message, code: RECORDING_ERROR_CODES.JOB_NOT_FOUND },
      { status: 404 }
    );
  }
  if (message === "Job is not recording") {
    return NextResponse.json(
      { error: message, code: RECORDING_ERROR_CODES.JOB_NOT_RECORDING },
      { status: 409 }
    );
  }
  if (
    message.startsWith("Expected ") ||
    message.startsWith("Missing recording chunk") ||
    message === "At least one chunk is required" ||
    message === "Recording has no audio file" ||
    message === "Invalid sequence"
  ) {
    return NextResponse.json(
      { error: message, code: RECORDING_ERROR_CODES.CONFLICT },
      { status: 409 }
    );
  }

  return NextResponse.json({ error: message }, { status: 400 });
}
