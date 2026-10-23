"use client";

import { useRouter } from "next/navigation";
import { Job } from "../../types/types";
import StatusChip from "../StatusChip";
import VisibilityIcon from "../job/VisibilityIcon";

type JobListProps = {
  jobs: Job[] | undefined;
  selectedJobPublicId?: string;
  onSelectJob?: (job: Job) => void;
};

export default function JobList({
  jobs,
  selectedJobPublicId,
  onSelectJob,
}: JobListProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-1 p-2">
      {(jobs ?? []).map((job) => {
        const selected = job.publicId === selectedJobPublicId;
        return (
          <button
            key={job.publicId ?? job.id ?? job.name}
            type="button"
            onClick={() => {
              onSelectJob?.(job);
              if (job.publicId) {
                router.push(`/job/${job.publicId}`);
              }
            }}
            className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-4 py-3.5 text-left transition ${
              selected
                ? "bg-primary/15 text-primary"
                : "hover:bg-surface-hover"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2 pr-2">
              <VisibilityIcon visibility={job.visibility} />
              <span className="truncate text-base font-medium">{job.name}</span>
            </span>
            <StatusChip status={job.status} size="sm" />
          </button>
        );
      })}
    </div>
  );
}
