"use client";

import { useEffect, useState } from "react";
import { Select, useLocalization } from "@helpwave/hightide";
import useAppTranslation from "../../hooks/useAppTranslation";
import SettingsSection from "./SettingsSection";

export default function LanguageSection() {
  const translation = useAppTranslation();
  const { setLocale, supportedLocales } = useLocalization();
  const [preferred, setPreferred] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("locale");
    if (stored && stored in supportedLocales) {
      setPreferred(stored);
    } else {
      setPreferred(null);
    }
  }, [supportedLocales]);

  return (
    <SettingsSection
      title={translation("languageSection")}
      description={translation("languageSectionDescription")}
    >
      <Select
        value={preferred}
        onValueChange={(value) => {
          if (value === null) {
            setPreferred(null);
            setLocale("system");
            return;
          }
          setPreferred(value);
          setLocale(value);
        }}
        showSearch={false}
        triggerProps={{ className: "min-w-40 w-fit" }}
      >
        <Select.Option
          value={null}
          valueId="system"
          label={translation("system")}
        >
          {translation("system")}
        </Select.Option>
        {Object.entries(supportedLocales).map(([code, info]) => (
          <Select.Option key={code} value={code} label={info.localName}>
            {info.localName}
          </Select.Option>
        ))}
      </Select>
    </SettingsSection>
  );
}
