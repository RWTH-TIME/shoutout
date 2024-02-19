export type Job = {
  name: string;
  audioFile: File | string | undefined;
  participants: number;
  language: string;
  status: STATUS;
};

export type BulkJob = {
  name: string;
  audioFile: File | string | undefined;
  status: STATUS;
};

/* returns true when validation successful, error message if not.
disable no-explicit-any because we don't want to pre-define specific 
types for that function */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ValidationFunction = (data: any) => string | boolean

export enum STATUS {
  Pending = "PENDING",
  Running = "RUNNING",
  Finished = "FINISHED",
  Failed = "FAILED"
}
