import type { Metadata, Viewport } from "next";
import SessionWrapper from "./components/SessionWrapper";
import ServiceWorkerRegistrar from "./components/ServiceWorkerRegistrar";
import { FeaturesProvider } from "./context/FeaturesContext";
import config from "./lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "shoutout",
  description: "Audio transcription jobs",
  applicationName: "shoutout",
  appleWebApp: {
    capable: true,
    title: "shoutout",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <FeaturesProvider mailEnabled={config.MAIL_ENABLED}>
          <SessionWrapper>
            <ServiceWorkerRegistrar />
            {children}
          </SessionWrapper>
        </FeaturesProvider>
      </body>
    </html>
  );
}
