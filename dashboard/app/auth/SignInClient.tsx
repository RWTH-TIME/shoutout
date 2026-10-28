"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@helpwave/hightide";
import useAppTranslation from "../hooks/useAppTranslation";
import WaveformLogo from "../components/WaveformLogo";

type SignInClientProps = {
  providerName: string;
};

function SignInContent({ providerName }: SignInClientProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const translation = useAppTranslation();

  const errorMessage = useMemo(() => {
    if (!error) {
      return null;
    }
    if (error === "OAuthSignin" || error === "OAuthCallback") {
      return translation("signInErrorReach");
    }
    return translation("signInErrorGeneric", { error });
  }, [error, translation]);

  useEffect(() => {
    if (status === "loading") {
      return;
    }
    if (session) {
      router.replace(callbackUrl);
    }
  }, [callbackUrl, session, status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-divider bg-surface p-8 text-on-surface shadow-sm">
        <WaveformLogo className="size-14" />
        <h1 className="text-2xl font-semibold">{translation("signInTitle")}</h1>
        <p className="text-sm text-description">
          {translation("signInDescription")}
        </p>
        {errorMessage ? (
          <div className="rounded-lg border border-negative/30 bg-negative/10 p-3 text-sm text-negative">
            {errorMessage}
          </div>
        ) : null}
        <Button onClick={() => signIn("keycloak", { callbackUrl })}>
          {translation("signInButton", { provider: providerName })}
        </Button>
      </div>
    </div>
  );
}

export default function SignInClient({ providerName }: SignInClientProps) {
  const translation = useAppTranslation();

  return (
    <Suspense fallback={<div className="p-6">{translation("loading")}</div>}>
      <SignInContent providerName={providerName} />
    </Suspense>
  );
}
