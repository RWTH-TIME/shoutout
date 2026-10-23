"use client";

import { ThemeSelect } from "@helpwave/hightide";
import useAppTranslation from "../../hooks/useAppTranslation";
import SettingsSection from "./SettingsSection";

export default function ThemeSection() {
  const translation = useAppTranslation();

  return (
    <SettingsSection
      title={translation("themeSection")}
      description={translation("themeSectionDescription")}
    >
      <ThemeSelect />
    </SettingsSection>
  );
}
