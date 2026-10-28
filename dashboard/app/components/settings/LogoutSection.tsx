"use client";

import { signOut } from "next-auth/react";
import { Button } from "@helpwave/hightide";
import { LogOut } from "lucide-react";
import useAppTranslation from "../../hooks/useAppTranslation";
import SettingsSection from "./SettingsSection";

export default function LogoutSection() {
  const translation = useAppTranslation();

  return (
    <SettingsSection
      title={translation("logoutSection")}
      description={translation("logoutSectionDescription")}
    >
      <Button
        color="negative"
        coloringStyle="outline"
        onClick={() => {
          void signOut({ callbackUrl: "/auth" });
        }}
      >
        <LogOut size={18} />
        {translation("logout")}
      </Button>
    </SettingsSection>
  );
}
