export type Visibility = "PRIVATE" | "AUTHENTICATED" | "PUBLIC";

export type JobFile = {
  id: string;
  jobId?: number;
  position: number;
  originalName: string;
  audioFile: string;
  participants?: number | null;
  language?: string | null;
  resultTextKey?: string | null;
  resultJsonKey?: string | null;
  durationSeconds?: number | null;
  speakerNames?: Record<string, string> | null;
};

export type Job = {
  id?: number;
  publicId: string;
  name: string;
  audioFile?: File | string | null;
  model: string;
  participants?: number | null;
  language?: string | null;
  status: STATUS | "PENDING" | "RUNNING" | "FINISHED" | "FAILED" | "CANCELLED";
  createdAt: Date | string;
  expiresAt?: Date | string | null;
  visibility?: Visibility;
  notifyEmail?: string | null;
  notifyEnabled?: boolean;
  error?: string | null;
  files?: JobFile[];
  resultZipKey?: string | null;
};

export type BulkFileEntry = {
  file: File;
  model: string;
  participants: number;
  language: string;
};

export type TranscriptSegment = {
  speaker: string;
  start: number;
  end: number;
  text: string;
};

export type NotificationSettings = {
  notifyEmail: string | null;
  notifyOnFinish: boolean;
  notifyOnFail: boolean;
};

export type ValidationFunction = (data: unknown) => string | boolean;

export enum STATUS {
  Pending = "PENDING",
  Running = "RUNNING",
  Finished = "FINISHED",
  Failed = "FAILED",
  Cancelled = "CANCELLED",
}

export type AvailableModel = {
  model: string;
  workerCount: number;
};
