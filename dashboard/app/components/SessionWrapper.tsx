"use client";

import { SessionProvider } from "next-auth/react";
import { HightideProvider } from "@helpwave/hightide";
import { AlertProvider } from "../context/AlertContext";
import AlertPopup from "./utils/Alert";

type Props = {
  children: React.ReactNode;
};

export default function SessionWrapper({ children }: Props) {
  return (
    <SessionProvider>
      <HightideProvider locale={{ locale: "de-DE" }}>
        <AlertProvider>
          <AlertPopup />
          {children}
        </AlertProvider>
      </HightideProvider>
    </SessionProvider>
  );
}
