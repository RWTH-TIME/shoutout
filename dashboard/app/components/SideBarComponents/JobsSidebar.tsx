"use client";

import { useState } from "react";
import { Button } from "@helpwave/hightide";
import { Plus } from "lucide-react";
import { Job } from "../../types/types";
import useJobs from "../../hooks/useJob";
import useAppTranslation from "../../hooks/useAppTranslation";
import CreateJobModal from "./CreateJobModal";
import JobList from "./JobList";

type JobsSidebarProps = {
  selectedJobName?: string;
  setSelectedJob?: React.Dispatch<React.SetStateAction<Job | undefined>>;
  onSelectJob?: (job: Job) => void;
};

export default function JobsSidebar({
  selectedJobName,
  setSelectedJob,
  onSelectJob,
}: JobsSidebarProps) {
  const { jobs } = useJobs();
  const translation = useAppTranslation();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          <JobList
            jobs={jobs}
            selectedJobName={selectedJobName}
            setSelectedJob={setSelectedJob}
            onSelectJob={onSelectJob}
          />
        </div>
        <div className="shrink-0 border-t border-divider p-4">
          <Button
            color="primary"
            className="w-full"
            onClick={() => setCreateOpen(true)}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Plus className="size-4 shrink-0" aria-hidden />
              {translation("addJob")}
            </span>
          </Button>
        </div>
      </div>
      <CreateJobModal isOpen={createOpen} setOpen={setCreateOpen} />
    </>
  );
}
