"use client";

import { useRouter } from "next/navigation";
import AppShell from "../AppShell";
import {
  JobsSidebarAddButton,
  JobsSidebarList,
} from "../SideBarComponents/JobsSidebar";
import useAppTranslation from "../../hooks/useAppTranslation";
import ThemeSection from "./ThemeSection";
import LanguageSection from "./LanguageSection";
import ApiKeysSection from "./ApiKeysSection";
import NotificationsSection from "./NotificationsSection";
import LogoutSection from "./LogoutSection";

export default function SettingsClient() {
  const translation = useAppTranslation();
  const router = useRouter();

  return (
    <AppShell
      activeId="settings"
      sidebarContent={
        <JobsSidebarList
          onSelectJob={(job) => {
            router.push(`/job/${job.publicId}`);
          }}
        />
      }
      sidebarFooter={<JobsSidebarAddButton />}
    >
      <div className="h-full min-h-0 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold">
              {translation("settingsTitle")}
            </h1>
            <p className="mt-1 text-sm text-description">
              {translation("settingsDescription")}
            </p>
          </div>
          <ThemeSection />
          <LanguageSection />
          <NotificationsSection />
          <ApiKeysSection />
          <LogoutSection />
        </div>
      </div>
    </AppShell>
  );
}
