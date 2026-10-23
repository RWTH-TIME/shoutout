"use client";

import { Chip } from "@helpwave/hightide";
import { STATUS } from "../types/types";
import { getStatusColor } from "../utils/status";
import useAppTranslation from "../hooks/useAppTranslation";

type StatusChipProps = {
  status: STATUS | string;
  size?: "xs" | "sm" | "md" | "lg" | null;
};

function statusLabelKey(
  status: string
):
  | "statusPending"
  | "statusRunning"
  | "statusFinished"
  | "statusFailed"
  | null {
  if (status === STATUS.Pending) return "statusPending";
  if (status === STATUS.Running) return "statusRunning";
  if (status === STATUS.Finished) return "statusFinished";
  if (status === STATUS.Failed) return "statusFailed";
  return null;
}

export default function StatusChip({ status, size = "xs" }: StatusChipProps) {
  const translation = useAppTranslation();
  const key = statusLabelKey(status);
  const label = key ? translation(key) : status;

  return (
    <Chip color={getStatusColor(status)} coloringStyle="tonal" size={size}>
      {label}
    </Chip>
  );
}
