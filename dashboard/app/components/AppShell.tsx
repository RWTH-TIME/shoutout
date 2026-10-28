"use client";

import Link from "next/link";
import { AppPage, Avatar, Button } from "@helpwave/hightide";
import { useSession } from "next-auth/react";
import { Settings } from "lucide-react";
import useAppTranslation from "../hooks/useAppTranslation";
import WaveformLogo from "./WaveformLogo";

type AppShellProps = {
  children: React.ReactNode;
  sidebarContent: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  activeId?: string | null;
  headerActions?: React.ReactNode[];
};

function NextLink({
  href,
  className,
  children,
  target,
  rel,
  ...rest
}: {
  href: string;
  className?: string;
  children?: React.ReactNode;
  target?: string;
  rel?: string;
  "aria-current"?: "page";
}) {
  return (
    <Link
      href={href}
      className={className}
      target={target}
      rel={rel}
      aria-current={rest["aria-current"]}
    >
      {children}
    </Link>
  );
}

export default function AppShell({
  children,
  sidebarContent,
  sidebarFooter,
  activeId,
  headerActions = [],
}: AppShellProps) {
  const { data: session } = useSession();
  const translation = useAppTranslation();

  const displayName: string = session?.user?.name ?? "User";
  const accountUrl: string | undefined = session?.user?.issuer
    ? `${session.user.issuer}/account`
    : undefined;
  const avatarImage = session?.user?.image
    ? { avatarUrl: session.user.image, alt: displayName }
    : undefined;

  const userControl = (
    <>
      <span className="hidden text-base font-medium sm:inline">
        {session?.user?.name}
      </span>
      <Avatar name={displayName} size="md" image={avatarImage} />
    </>
  );

  return (
    <AppPage
      noScrolling
      hasSpacer={false}
      headerActions={[
        <div
          key="header-actions"
          className="ms-auto flex flex-1 flex-row items-center justify-end gap-3"
        >
          {headerActions}
          <Link href="/settings">
            <Button
              coloringStyle={activeId === "settings" ? "tonal" : "text"}
              color="primary"
              size="lg"
            >
              <Settings size={22} />
              <span className="hidden sm:inline">{translation("settings")}</span>
            </Button>
          </Link>
          {accountUrl ? (
            <Button
              coloringStyle="text"
              color="primary"
              size="lg"
              onClick={() => {
                window.location.href = accountUrl;
              }}
            >
              {userControl}
            </Button>
          ) : (
            <div className="flex items-center gap-2">{userControl}</div>
          )}
        </div>,
      ]}
      sidebarProps={{
        activeId,
        header: (
          <Link
            href="/"
            className="flex w-full flex-row items-center justify-center gap-2 text-inherit no-underline"
            aria-label={translation("appName")}
          >
            <WaveformLogo className="size-8" />
            <span className="text-2xl font-semibold leading-none tracking-tight">
              {translation("appName")}
            </span>
          </Link>
        ),
        contentOverwrite: sidebarContent,
        footer: sidebarFooter,
        LinkComponent: NextLink,
      }}
    >
      {children}
    </AppPage>
  );
}
