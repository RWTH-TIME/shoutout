"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Job, TranscriptSegment } from "../../types/types";
import useAppTranslation from "../../hooks/useAppTranslation";
import AppShell from "../AppShell";
import {
  JobsSidebarAddButton,
  JobsSidebarList,
} from "../SideBarComponents/JobsSidebar";
import JobHeader from "./JobHeader";
import JobMetaGrid from "./JobMetaGrid";
import FileTabs from "./FileTabs";
import TranscriptPreview from "./TranscriptPreview";
import AudioPlayer from "./AudioPlayer";

type Props = {
  publicId: string;
  initialJob: Job;
  canManage: boolean;
  showSidebar: boolean;
};

async function jobFetcher(url: string): Promise<{ job: Job; canManage: boolean }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load job");
  }
  return response.json();
}

export default function JobDetailClient({
  publicId,
  initialJob,
  canManage: initialCanManage,
  showSidebar,
}: Props) {
  const translation = useAppTranslation();
  const router = useRouter();
  const { data, mutate } = useSWR(
    `/api/jobs/${publicId}`,
    jobFetcher,
    {
      fallbackData: { job: initialJob, canManage: initialCanManage },
      refreshInterval: (current) =>
        current?.job?.status === "PENDING" || current?.job?.status === "RUNNING"
          ? 4000
          : 0,
    }
  );

  const job = data?.job ?? initialJob;
  const canManage = data?.canManage ?? initialCanManage;
  const files = job.files ?? [];
  const [activeFileId, setActiveFileId] = useState(files[0]?.id ?? "");
  const [segments, setSegments] = useState<TranscriptSegment[] | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!activeFileId && files[0]?.id) {
      setActiveFileId(files[0].id);
    }
  }, [activeFileId, files]);

  const activeFile = useMemo(
    () => files.find((file) => file.id === activeFileId) ?? files[0],
    [activeFileId, files]
  );

  useEffect(() => {
    if (!activeFile?.resultJsonKey || job.status !== "FINISHED") {
      setSegments(null);
      return;
    }
    let cancelled = false;
    setLoadingTranscript(true);
    fetch(`/api/jobs/${publicId}/files/${activeFile.id}/transcript`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed");
        }
        return response.json();
      })
      .then((payload) => {
        if (!cancelled) {
          setSegments(
            Array.isArray(payload.segments) ? payload.segments : []
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSegments([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingTranscript(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeFile?.id, activeFile?.resultJsonKey, job.status, publicId]);

  const content = (
    <div className="h-full min-h-0 overflow-y-auto p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 rounded-2xl border border-divider bg-surface p-8 text-on-surface shadow-sm md:p-10">
        <JobHeader
          job={job}
          canManage={canManage}
          onUpdated={(updated) => {
            void mutate({ job: updated, canManage }, false);
          }}
          onDeleted={() => router.push("/")}
        />

        <div className="border-t border-divider pt-8">
          <JobMetaGrid job={job} />
        </div>

        {job.error ? (
          <div className="rounded-lg border border-negative/30 bg-negative/10 p-4 text-sm">
            {job.error}
          </div>
        ) : null}

        <div className="border-t border-divider pt-8">
          <FileTabs
            files={files}
            activeFileId={activeFile?.id ?? ""}
            onChange={(fileId) => {
              setActiveFileId(fileId);
              setSeekTo(null);
              setCurrentTime(0);
            }}
          />
        </div>

        {activeFile ? (
          <div className="flex flex-col gap-5 border-t border-divider pt-8">
            <AudioPlayer
              src={`/api/jobs/${publicId}/files/${activeFile.id}/audio`}
              seekTo={seekTo}
              onTimeUpdate={setCurrentTime}
            />
            <div>
              <div className="mb-3 text-sm font-semibold">
                {translation("transcriptPreview")}
              </div>
              <TranscriptPreview
                segments={segments}
                loading={loadingTranscript}
                currentTime={currentTime}
                onSeek={setSeekTo}
              />
            </div>
          </div>
        ) : (
          <div className="border-t border-divider pt-8 text-sm text-description">
            {translation("noTranscriptYet")}
          </div>
        )}
      </div>
    </div>
  );

  if (!showSidebar) {
    return content;
  }

  return (
    <AppShell
      activeId="jobs"
      sidebarContent={
        <JobsSidebarList
          selectedJobPublicId={job.publicId}
          onSelectJob={(selected) => {
            router.push(`/job/${selected.publicId}`);
          }}
        />
      }
      sidebarFooter={<JobsSidebarAddButton />}
    >
      {content}
    </AppShell>
  );
}
