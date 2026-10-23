"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ContentBox from "./ContentBox";
import JobsSidebar from "./SideBarComponents/JobsSidebar";
import AppShell from "./AppShell";
import useJobs from "../hooks/useJob";
import useAppTranslation from "../hooks/useAppTranslation";
import { Job } from "../types/types";

function HomeClientInner() {
  const { jobs } = useJobs();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedJob, setSelectedJob] = useState<Job>();

  useEffect(() => {
    const jobName = searchParams.get("job");
    if (!jobName || !jobs) {
      return;
    }
    const match = jobs.find((job) => job.name === jobName);
    if (match) {
      setSelectedJob(match);
      router.replace("/", { scroll: false });
    }
  }, [jobs, router, searchParams]);

  useEffect(() => {
    if (!selectedJob || !jobs) {
      return;
    }
    const refreshed = jobs.find((job) => job.name === selectedJob.name);
    if (refreshed) {
      setSelectedJob(refreshed);
    }
  }, [jobs, selectedJob]);

  return (
    <AppShell
      activeId="jobs"
      sidebarContent={
        <JobsSidebar
          selectedJobName={selectedJob?.name}
          setSelectedJob={setSelectedJob}
        />
      }
    >
      <ContentBox setSelectedJob={setSelectedJob} jobDetail={selectedJob} />
    </AppShell>
  );
}

export default function HomeClient() {
  const translation = useAppTranslation();

  return (
    <Suspense fallback={<div className="p-6">{translation("loading")}</div>}>
      <HomeClientInner />
    </Suspense>
  );
}
