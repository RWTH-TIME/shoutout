export interface BulkJob {
  name: string,
  audioFile: File | string | undefined;
  password?: string;
  password_repeat?: string;
  status: string;
}

export interface Job extends BulkJob {
  language: string;
  participants: number;
}

// returns true when validation successfull, error message if not
export type ValidationFunction = (data: any) => string | boolean
