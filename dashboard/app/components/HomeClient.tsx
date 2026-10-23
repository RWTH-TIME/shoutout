"use client";

import { useRouter } from "next/navigation";
import ContentBox from "./ContentBox";
import {
  JobsSidebarAddButton,
  JobsSidebarList,
} from "./SideBarComponents/JobsSidebar";
import AppShell from "./AppShell";

export default function HomeClient() {
  const router = useRouter();

  return (
    <AppShell
      activeId="jobs"
      sidebarContent={
        <JobsSidebarList
          onSelectJob={(job) => {
            router.push(`/job/${job.publicId}`);
          }}
        />
      }
      sidebarFooter={<JobsSidebarAddButton />}
    >
      <ContentBox />
    </AppShell>
  );
}
