export type Job = {
  id?: number;
  name: string;
  audioFile: File | string | undefined;
  model: string;
  participants: number;
  language: string;
  status: STATUS;
  createdAt: Date;
  notifyEmail?: string;
  error?: string | null;
};

export type BulkFileEntry = {
  file: File;
  name: string;
  model: string;
  participants: number;
  language: string;
};

export type ValidationFunction = (data: unknown) => string | boolean;

export enum STATUS {
  Pending = "PENDING",
  Running = "RUNNING",
  Finished = "FINISHED",
  Failed = "FAILED",
}

export type AvailableModel = {
  model: string;
  workerCount: number;
};
