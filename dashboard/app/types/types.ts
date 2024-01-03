import { InputLabelProps } from "@mui/material";

type selectOptions = {
  name: string;
  value: string | number;
};

export interface BulkJob {
  name: string,
  audioFile: File | string | undefined;
  password: string;
  password_repeat: string;
  isProtected?: boolean;
  isAuth?: boolean;
  status: string;
}

export interface Job extends BulkJob {
  language: string;
  participants: number;
}

export type Input<T> = {
  name: keyof T;
  type: string;
  label: string;
  required: boolean;
  useFullWidth: boolean;
  validationType?: string | ValidationFunction;
  inputLabelProps?: InputLabelProps;
  selectOptions?: selectOptions[];
  helperText?: string;
  inputProps?: {
    accept?: string;
    endAdornment?: any;
  };
};

// returns true when validation successfull, error message if not
export type ValidationFunction = (data: any) => string | boolean
