import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/authOptions";
import { getJobByPublicId } from "../../services/jobService";
import {
  canManageJob,
  canViewJob,
  isJobExpired,
} from "../../services/accessService";
import type { AuthContext } from "../../lib/auth";
import JobDetailClient from "../../components/job/JobDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function JobPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const job = await getJobByPublicId(id);

  if (!job || isJobExpired(job.expiresAt)) {
    notFound();
  }

  const auth: AuthContext | null = session?.user?.id
    ? {
        owner: session.user.id,
        email: session.user.email,
        kind: "session",
      }
    : null;

  if (!canViewJob(job, auth)) {
    if (!auth && job.visibility === "AUTHENTICATED") {
      redirect(`/auth?callbackUrl=${encodeURIComponent(`/job/${id}`)}`);
    }
    notFound();
  }

  return (
    <JobDetailClient
      publicId={job.publicId}
      initialJob={job}
      canManage={canManageJob(job, auth)}
      showSidebar={Boolean(auth)}
    />
  );
}
