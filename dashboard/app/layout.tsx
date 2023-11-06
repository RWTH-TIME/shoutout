import AppBarCustom from "./components/AppBarCustom";

import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Shoutout",
  description: "",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body style={{ margin: "0px" }} className={inter.className}>
        <div>
          <AppBarCustom />
        </div>
        <div>{children}</div>
      </body>
    </html>
  );
}
