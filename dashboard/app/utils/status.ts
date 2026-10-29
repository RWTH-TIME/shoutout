import { STATUS } from "../types/types";

export type StatusColor =
  | "neutral"
  | "negative"
  | "positive"
  | "warning"
  | "primary";

export const STATUS_COLORS: Record<STATUS, StatusColor> = {
  [STATUS.Pending]: "warning",
  [STATUS.Running]: "primary",
  [STATUS.Finished]: "positive",
  [STATUS.Failed]: "negative",
  [STATUS.Cancelled]: "neutral",
};

export function getStatusColor(status: string): StatusColor {
  if (status === STATUS.Failed) return STATUS_COLORS[STATUS.Failed];
  if (status === STATUS.Finished) return STATUS_COLORS[STATUS.Finished];
  if (status === STATUS.Running) return STATUS_COLORS[STATUS.Running];
  if (status === STATUS.Pending) return STATUS_COLORS[STATUS.Pending];
  if (status === STATUS.Cancelled) return STATUS_COLORS[STATUS.Cancelled];
  return "neutral";
}

export function isActiveStatus(status: string): boolean {
  return status === STATUS.Pending || status === STATUS.Running;
}
