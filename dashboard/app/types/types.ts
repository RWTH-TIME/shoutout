export type Job = {
  name: string;
  audioFile: File | string | undefined;
  participants: number;
  language: string;
  status: string;
};

export type BulkJob = {
  name: string;
  audioFile: File | string | undefined;
};

// returns true when validation successfull, error message if not
export type ValidationFunction = (data: any) => string | boolean

export enum STATUS {
  Pending = "PENDING",
  Running = "RUNNING",
  Finished = "FINISHED",
  Failed = "FAILED"
}