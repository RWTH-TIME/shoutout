import { Visibility, type job } from "@prisma/client";
import type { AuthContext } from "../lib/auth";

export type JobAccess = Pick<job, "owner" | "visibility">;

export function canViewJob(
  jobRecord: JobAccess,
  auth: AuthContext | null
): boolean {
  if (jobRecord.visibility === Visibility.PUBLIC) {
    return true;
  }
  if (!auth || auth.kind === "worker" || auth.kind === "enrollment") {
    return false;
  }
  if (jobRecord.owner === auth.owner) {
    return true;
  }
  return jobRecord.visibility === Visibility.AUTHENTICATED;
}

export function canManageJob(
  jobRecord: JobAccess,
  auth: AuthContext | null
): boolean {
  if (!auth || auth.kind === "worker" || auth.kind === "enrollment") {
    return false;
  }
  return jobRecord.owner === auth.owner;
}

export function isJobExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) {
    return false;
  }
  return expiresAt.getTime() < Date.now();
}
