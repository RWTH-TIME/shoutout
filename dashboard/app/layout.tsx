import SessionWrapper from "./components/SessionWrapper";
import "./globals.css";

export const metadata = {
  title: "Shoutout",
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
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}
