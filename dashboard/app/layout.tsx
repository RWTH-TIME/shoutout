import SessionWrapper from "./components/SessionWrapper";
import { FeaturesProvider } from "./context/FeaturesContext";
import config from "./lib/config";
import "./globals.css";

export const metadata = {
  title: "shoutout",
  description: "Audio transcription jobs",
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
          <SessionWrapper>{children}</SessionWrapper>
        </FeaturesProvider>
      </body>
    </html>
  );
}
