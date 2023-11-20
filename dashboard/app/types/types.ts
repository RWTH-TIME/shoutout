export type Job = {
  name: string;
  audioFile: File | string | undefined;
  participants: number;
  language: string;
  status: string;
};

// returns true when validation successfull, error message if not
export type ValidationFunction = (data: any) => string | boolean
