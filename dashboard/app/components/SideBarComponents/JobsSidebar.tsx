"use client";

import { useState } from "react";
import { Button } from "@helpwave/hightide";
import { Mic, Plus } from "lucide-react";
import { Job } from "../../types/types";
import useJobs from "../../hooks/useJob";
import useAppTranslation from "../../hooks/useAppTranslation";
import { useRecording } from "../../hooks/useRecording";
import CreateJobModal from "./CreateJobModal";
import JobList from "./JobList";

type JobsSidebarProps = {
  selectedJobPublicId?: string;
  onSelectJob?: (job: Job) => void;
  renderAsShellParts?: boolean;
};

function SidebarActions({
  onAddJob,
}: {
  onAddJob: () => void;
}) {
  const translation = useAppTranslation();
  const { setDialogOpen, status, supportsRecorder } = useRecording();
  const recordingActive =
    status.state === "recording" || status.state === "stopping";

  return (
    <div className="flex flex-col gap-2">
      <Button
        color="primary"
        className="w-full"
        onClick={onAddJob}
        disabled={recordingActive}
      >
        <span className="inline-flex items-center justify-center gap-2">
          <Plus className="size-4 shrink-0" aria-hidden />
          {translation("addJob")}
        </span>
      </Button>
      <Button
        coloringStyle="tonal"
        color="primary"
        className="w-full"
        onClick={() => setDialogOpen(true)}
        disabled={!supportsRecorder || recordingActive}
      >
        <span className="inline-flex items-center justify-center gap-2">
          <Mic className="size-4 shrink-0" aria-hidden />
          {translation("recordMeeting")}
        </span>
      </Button>
    </div>
  );
}

export default function JobsSidebar({
  selectedJobPublicId,
  onSelectJob,
  renderAsShellParts = false,
}: JobsSidebarProps) {
  const { jobs } = useJobs();
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
      <SidebarActions onAddJob={() => setCreateOpen(true)} />
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
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <>
      <div className="p-1">
        <SidebarActions onAddJob={() => setCreateOpen(true)} />
      </div>
      <CreateJobModal isOpen={createOpen} setOpen={setCreateOpen} />
    </>
  );
}
