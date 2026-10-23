"use client";

import { Button } from "@helpwave/hightide";
import { LANGUAGE_OPTIONS } from "../../utils/languages";
import useAppTranslation from "../../hooks/useAppTranslation";

type LanguageToggleProps = {
  value: string;
  onChange: (value: string) => void;
  size?: "xs" | "sm" | "md" | "lg";
};

export default function LanguageToggle({
  value,
  onChange,
  size = "sm",
}: LanguageToggleProps) {
  const translation = useAppTranslation();

  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-divider p-1">
      {LANGUAGE_OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <Button
            key={option.value || "auto"}
            size={size}
            color={active ? "primary" : "neutral"}
            coloringStyle={active ? "solid" : "text"}
            onClick={() => onChange(option.value)}
          >
            {translation(option.nameKey)}
          </Button>
        );
      })}
    </div>
  );
}
