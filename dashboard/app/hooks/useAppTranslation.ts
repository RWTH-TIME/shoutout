"use client";

import { useTranslation } from "@helpwave/hightide";
import type { AppTranslationEntries } from "../i18n/translations";

export default function useAppTranslation() {
  return useTranslation<string, AppTranslationEntries>();
}
