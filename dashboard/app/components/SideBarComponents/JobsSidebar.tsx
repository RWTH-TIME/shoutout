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
  selectedJobPublicId?: string;
  onSelectJob?: (job: Job) => void;
  renderAsShellParts?: boolean;
};

export default function JobsSidebar({
  selectedJobPublicId,
  onSelectJob,
  renderAsShellParts = false,
}: JobsSidebarProps) {
  const { jobs } = useJobs();
  const translation = useAppTranslation();
  const [createOpen, setCreateOpen] = useState(false);

  const list = (
    <JobList
      jobs={jobs}
      selectedJobPublicId={selectedJobPublicId}
      onSelectJob={onSelectJob}
    />
  );

  const footer = (
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
  );

  return (
    <>
      {renderAsShellParts ? (
        list
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            {list}
          </div>
          {footer}
        </div>
      )}
      <CreateJobModal isOpen={createOpen} setOpen={setCreateOpen} />
    </>
  );
}

export function JobsSidebarList({
  selectedJobPublicId,
  onSelectJob,
}: {
  selectedJobPublicId?: string;
  onSelectJob?: (job: Job) => void;
}) {
  const { jobs } = useJobs();
  return (
    <JobList
      jobs={jobs}
      selectedJobPublicId={selectedJobPublicId}
      onSelectJob={onSelectJob}
    />
  );
}

export function JobsSidebarAddButton() {
  const translation = useAppTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <>
      <div className="p-1">
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
      <CreateJobModal isOpen={createOpen} setOpen={setCreateOpen} />
    </>
  );
}
