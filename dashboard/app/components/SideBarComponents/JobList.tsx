"use client";

import { Job } from "../../types/types";
import StatusChip from "../StatusChip";

type JobListProps = {
  jobs: Job[] | undefined;
  selectedJobName?: string;
  setSelectedJob?: React.Dispatch<React.SetStateAction<Job | undefined>>;
  onSelectJob?: (job: Job) => void;
};

export default function JobList({
  jobs,
  selectedJobName,
  setSelectedJob,
  onSelectJob,
}: JobListProps) {
  return (
    <div className="flex flex-col gap-1 p-2">
      {(jobs ?? []).map((job) => {
        const selected = job.name === selectedJobName;
        return (
          <button
            key={job.id ?? job.name}
            type="button"
            onClick={() => {
              setSelectedJob?.(job);
              onSelectJob?.(job);
            }}
            className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-4 py-3.5 text-left transition ${
              selected
                ? "bg-primary/15 text-primary"
                : "hover:bg-surface-hover"
            }`}
          >
            <span className="truncate pr-2 text-base font-medium">{job.name}</span>
            <StatusChip status={job.status} size="sm" />
          </button>
        );
      })}
    </div>
  );
}
