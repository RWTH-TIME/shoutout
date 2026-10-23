import { STATUS } from "../types/types";

export type StatusColor =
  | "neutral"
  | "negative"
  | "positive"
  | "warning"
  | "primary";

export function getStatusColor(status: string): StatusColor {
  if (status === STATUS.Failed) return "negative";
  if (status === STATUS.Finished) return "positive";
  if (status === STATUS.Running) return "warning";
  if (status === STATUS.Pending) return "neutral";
  return "neutral";
}

export function isActiveStatus(status: string): boolean {
  return status === STATUS.Pending || status === STATUS.Running;
}
