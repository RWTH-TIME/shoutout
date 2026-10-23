"use client";

import { Chip } from "@helpwave/hightide";
import { Job } from "../../types/types";
import useJobs from "../../hooks/useJob";

type JobListProps = {
  jobs: Job[] | undefined;
  selectedJobName?: string;
  setSelectedJob: React.Dispatch<React.SetStateAction<Job | undefined>>;
};

export default function JobList({
  jobs,
  selectedJobName,
  setSelectedJob,
}: JobListProps) {
  const { getStatusColor } = useJobs();

  return (
    <div className="flex flex-col gap-1 p-2">
      {(jobs ?? []).map((job) => {
        const selected = job.name === selectedJobName;
        return (
          <button
            key={job.id ?? job.name}
            type="button"
            onClick={() => setSelectedJob(job)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${
              selected
                ? "bg-primary/15 text-primary"
                : "hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <span className="truncate pr-2 text-sm font-medium">{job.name}</span>
            <Chip
              color={getStatusColor(job.status)}
              coloringStyle="tonal"
              size="xs"
            >
              {job.status}
            </Chip>
          </button>
        );
      })}
    </div>
  );
}
