export type Job = {
  name: string;
  audioFile: File | string | undefined;
  participants: number;
  language: string;
  status: string;
};
