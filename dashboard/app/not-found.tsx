"use client";

import Link from "next/link";
import { Button } from "@helpwave/hightide";
import WaveformLogo from "./components/WaveformLogo";
import useAppTranslation from "./hooks/useAppTranslation";

export default function NotFound() {
  const translation = useAppTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-divider bg-surface p-8 text-on-surface shadow-sm">
        <WaveformLogo className="size-14" />
        <h1 className="text-2xl font-semibold">404 · {translation("notFoundTitle")}</h1>
        <p className="text-sm text-description">
          {translation("notFoundDescription")}
        </p>
        <Link href="/">
          <Button color="primary">{translation("backToJobs")}</Button>
        </Link>
      </div>
    </div>
  );
}
