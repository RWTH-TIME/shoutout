"use client";

import { useEffect, useState } from "react";
import { AppPage, Avatar, Button } from "@helpwave/hightide";
import { useSession } from "next-auth/react";
import ContentBox from "./ContentBox";
import JobList from "./SideBarComponents/JobList";
import CreateJobModal from "./SideBarComponents/CreateJobModal";
import ApiKeysModal from "./ApiKeysModal";
import useJobs from "../hooks/useJob";
import { Job } from "../types/types";

export default function HomeClient() {
  const { data: session } = useSession();
  const { jobs } = useJobs();
  const [selectedJob, setSelectedJob] = useState<Job>();
  const [createOpen, setCreateOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);

  useEffect(() => {
    if (!selectedJob || !jobs) {
      return;
    }
    const refreshed = jobs.find((job) => job.name === selectedJob.name);
    if (refreshed) {
      setSelectedJob(refreshed);
    }
  }, [jobs, selectedJob]);

  const accountUrl = session?.user?.issuer
    ? `${session.user.issuer}/account`
    : undefined;

  return (
    <>
      <AppPage
        noScrolling
        headerActions={[
          <Button
            key="keys"
            coloringStyle="tonal"
            size="sm"
            onClick={() => setKeysOpen(true)}
          >
            API keys
          </Button>,
          <button
            key="user"
            type="button"
            className="flex items-center gap-2"
            onClick={() => {
              if (accountUrl) {
                window.location.href = accountUrl;
              }
            }}
          >
            <span className="hidden text-sm sm:inline">
              {session?.user?.name}
            </span>
            <Avatar name={session?.user?.name ?? "User"} size="sm" />
          </button>,
        ]}
        sidebarProps={{
          header: <span className="text-lg font-semibold">Shoutout</span>,
          contentOverwrite: (
            <div className="flex h-full flex-col">
              <div className="p-2">
                <Button
                  color="primary"
                  className="w-full"
                  onClick={() => setCreateOpen(true)}
                >
                  Add job
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <JobList
                  jobs={jobs}
                  selectedJobName={selectedJob?.name}
                  setSelectedJob={setSelectedJob}
                />
              </div>
            </div>
          ),
        }}
      >
        <ContentBox
          setSelectedJob={setSelectedJob}
          jobDetail={selectedJob}
        />
      </AppPage>

      <CreateJobModal isOpen={createOpen} setOpen={setCreateOpen} />
      <ApiKeysModal isOpen={keysOpen} onClose={() => setKeysOpen(false)} />
    </>
  );
}
