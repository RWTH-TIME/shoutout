"use client";

import { useEffect } from "react";
import { useLocalization } from "@helpwave/hightide";

export default function HtmlLangSync() {
  const { locale } = useLocalization();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
