"use client";

import { SessionProvider } from "next-auth/react";
import { HightideConfigUtils, HightideProvider } from "@helpwave/hightide";
import { AlertProvider } from "../context/AlertContext";
import { appTranslation } from "../i18n/translations";
import AlertPopup from "./utils/Alert";
import HtmlLangSync from "./HtmlLangSync";

type Props = {
  children: React.ReactNode;
};

const supportedLocales = {
  "de-DE": HightideConfigUtils.defaultSupportedLocales["de-DE"],
  "en-US": HightideConfigUtils.defaultSupportedLocales["en-US"],
};

export default function SessionWrapper({ children }: Props) {
  return (
    <SessionProvider>
      <HightideProvider
        locale={{
          fallbackLocale: "en-US",
          supportedLocales,
        }}
        translation={{ translation: [appTranslation] }}
      >
        <HtmlLangSync />
        <AlertProvider>
          <AlertPopup />
          {children}
        </AlertProvider>
      </HightideProvider>
    </SessionProvider>
  );
}
